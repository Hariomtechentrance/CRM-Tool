import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const primary   = Color(0xFF6366F1); // indigo-500
  static const secondary = Color(0xFF8B5CF6); // violet-500
  static const success   = Color(0xFF10B981); // emerald-500
  static const warning   = Color(0xFFF59E0B); // amber-500
  static const danger    = Color(0xFFEF4444); // red-500
  static const info      = Color(0xFF06B6D4); // cyan-500

  static const bgLight   = Color(0xFFF1F5F9);
  static const cardLight = Color(0xFFFFFFFF);
  static const bgDark    = Color(0xFF0F172A);
  static const cardDark  = Color(0xFF1E293B);

  static const textPrimary = Color(0xFF0F172A);
  static const textSec     = Color(0xFF475569);
  static const textGhost   = Color(0xFF94A3B8);
  static const border      = Color(0xFFE2E8F0);

  static const gradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      primary: AppColors.primary,
      secondary: AppColors.secondary,
    ),
    scaffoldBackgroundColor: AppColors.bgLight,
    cardTheme: const CardThemeData(
      color: AppColors.cardLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(14)),
        side: BorderSide(color: AppColors.border),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.cardLight,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: AppColors.border,
      centerTitle: false,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.textPrimary,
      ),
      iconTheme: const IconThemeData(color: AppColors.textPrimary),
    ),
    textTheme: GoogleFonts.interTextTheme(),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.danger),
      ),
      labelStyle: const TextStyle(color: AppColors.textSec, fontSize: 13),
      hintStyle: const TextStyle(color: AppColors.textGhost, fontSize: 13),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.cardLight,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textGhost,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );

  static ThemeData get darkTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.dark,
    ),
    scaffoldBackgroundColor: AppColors.bgDark,
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
  );
}
