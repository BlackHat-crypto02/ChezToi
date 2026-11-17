import 'package:cheztoi/auth/connection.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ChezToi',
      theme: ThemeData(
        colorScheme: .fromSeed(seedColor: const Color(0xFF16005D)),
        useMaterial3: true,
      ),
      home: const Connection(),
      debugShowCheckedModeBanner: false,
    );
  }
}
