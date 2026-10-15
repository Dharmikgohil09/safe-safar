import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/map_state_provider.dart';
import 'screens/map_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SafeSafarApp());
}

class SafeSafarApp extends StatelessWidget {
  const SafeSafarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MapStateProvider()),
      ],
      child: MaterialApp(
        title: 'SafeSafar - Safe Route Navigator',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1E88E5),
            primary: const Color(0xFF1E88E5),
            secondary: const Color(0xFF00C853),
            surface: Colors.white,
          ),
          scaffoldBackgroundColor: const Color(0xFFF8F9FA),
          appBarTheme: const AppBarTheme(
            elevation: 0,
            backgroundColor: Colors.white,
            foregroundColor: Color(0xFF1A1A1A),
            centerTitle: false,
          ),
          fontFamily: 'Roboto',
        ),
        home: const MapScreen(),
      ),
    );
  }
}
