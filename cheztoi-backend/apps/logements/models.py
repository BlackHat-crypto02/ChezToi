from django.conf import settings
from django.db import models


class Equipement(models.Model):
    """Équipement sélectionnable sur une annonce (liste gérée par l'admin)."""

    nom = models.CharField(max_length=80, unique=True)
    icone = models.CharField(
        max_length=60,
        blank=True,
        help_text="Nom d'icône Remix côté application (facultatif).",
    )
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ("nom",)

    def __str__(self) -> str:
        return self.nom


class Logement(models.Model):
    """Annonce de location publiée par un propriétaire."""

    class Type(models.TextChoices):
        MAISON = "maison", "Maison"
        APPARTEMENT = "appartement", "Appartement"
        STUDIO = "studio", "Studio"
        CHAMBRE = "chambre", "Chambre"
        VILLA = "villa", "Villa"
        DUPLEX = "duplex", "Duplex"

    class Periodicite(models.TextChoices):
        NUIT = "nuit", "Nuit"
        SEMAINE = "semaine", "Semaine"
        MOIS = "mois", "Mois"
        ANNEE = "annee", "Année"

    class Statut(models.TextChoices):
        BROUILLON = "brouillon", "Brouillon"
        EN_ATTENTE = "en_attente", "En attente de validation"
        PUBLIEE = "publiee", "Publiée"
        REFUSEE = "refusee", "Refusée"
        SUSPENDUE = "suspendue", "Suspendue"
        LOUEE = "louee", "Louée"
        ARCHIVEE = "archivee", "Archivée"

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="logements",
    )

    # A. Informations générales
    titre = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    type_logement = models.CharField(max_length=20, choices=Type.choices)
    meuble = models.BooleanField(default=False)
    chambres = models.PositiveSmallIntegerField(default=1)
    salons = models.PositiveSmallIntegerField(default=0)
    salles_de_bain = models.PositiveSmallIntegerField(default=1)
    toilettes = models.PositiveSmallIntegerField(default=1)
    superficie = models.PositiveIntegerField(null=True, blank=True)
    etages_batiment = models.PositiveSmallIntegerField(null=True, blank=True)
    etage = models.SmallIntegerField(null=True, blank=True)
    capacite = models.PositiveSmallIntegerField(null=True, blank=True)

    # B. Équipements
    equipements = models.ManyToManyField(Equipement, blank=True)

    # C. Informations financières (montants entiers, devise XOF par défaut)
    prix = models.PositiveIntegerField()
    devise = models.CharField(max_length=3, default="XOF")
    periodicite = models.CharField(
        max_length=10,
        choices=Periodicite.choices,
        default=Periodicite.MOIS,
    )
    caution = models.PositiveIntegerField(default=0)
    avance = models.PositiveIntegerField(default=0)
    frais_supplementaires = models.PositiveIntegerField(default=0)
    charges = models.PositiveIntegerField(default=0)
    conditions_paiement = models.TextField(blank=True)
    conditions_annulation = models.TextField(blank=True)
    reservation_instantanee = models.BooleanField(
        default=False,
        help_text="Mode B : réservation confirmée sans validation du propriétaire.",
    )

    # D. Localisation
    pays = models.CharField(max_length=60, default="Togo")
    region = models.CharField(max_length=80, blank=True)
    ville = models.CharField(max_length=80)
    commune = models.CharField(max_length=80, blank=True)
    quartier = models.CharField(max_length=80, blank=True)
    adresse = models.CharField(max_length=200, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # F. Publication
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.BROUILLON,
    )
    motif_refus = models.TextField(blank=True)
    verifie = models.BooleanField(
        default=False,
        help_text="Annonce contrôlée par l'administration.",
    )
    nombre_vues = models.PositiveIntegerField(default=0)

    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)
    publie_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-cree_le",)

    def __str__(self) -> str:
        return f"{self.titre} ({self.ville})"

    @property
    def photo_principale(self):
        photos = list(self.photos.all())
        for photo in photos:
            if photo.principale:
                return photo
        return photos[0] if photos else None


class Photo(models.Model):
    logement = models.ForeignKey(
        Logement,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    image = models.ImageField(upload_to="logements/photos/%Y/%m/")
    legende = models.CharField(max_length=150, blank=True)
    ordre = models.PositiveSmallIntegerField(default=0)
    principale = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-principale", "ordre", "id")


class Panorama(models.Model):
    """Image équirectangulaire d'une pièce pour la visite virtuelle 360°."""

    logement = models.ForeignKey(
        Logement,
        on_delete=models.CASCADE,
        related_name="panoramas",
    )
    image = models.ImageField(upload_to="logements/panoramas/%Y/%m/")
    piece = models.CharField(max_length=80, default="Pièce")
    ordre = models.PositiveSmallIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("ordre", "id")


class Favori(models.Model):
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favoris",
    )
    logement = models.ForeignKey(
        Logement,
        on_delete=models.CASCADE,
        related_name="favoris",
    )
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-cree_le",)
        constraints = [
            models.UniqueConstraint(
                fields=("utilisateur", "logement"),
                name="favori_unique",
            )
        ]


class RechercheEnregistree(models.Model):
    """Alerte : l'utilisateur est notifié des nouvelles annonces correspondantes."""

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recherches",
    )
    nom = models.CharField(max_length=100)
    criteres = models.JSONField(default=dict)
    alerte_active = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-cree_le",)
