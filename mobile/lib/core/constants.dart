class AppConstants {
  // ── API ──────────────────────────────────────────────────────
  // Change to your Render backend URL in production
  static const String baseUrl =
      String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:5000/api');
  // 10.0.2.2 = Android emulator localhost; use your machine IP for physical device

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // ── Storage keys ─────────────────────────────────────────────
  static const String kAccessToken  = 'access_token';
  static const String kRefreshToken = 'refresh_token';
  static const String kActiveOrgId  = 'active_org_id';
  static const String kUserData     = 'user_data';

  // ── App ──────────────────────────────────────────────────────
  static const String appName    = 'FlowCRM';
  static const String appVersion = '1.0.0';
}
