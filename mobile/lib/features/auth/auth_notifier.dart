import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user.dart';
import '../../data/services/api_client.dart';
import '../../data/services/storage_service.dart';

// ── Auth state ────────────────────────────────────────────────
class AuthState {
  final AppUser? user;
  final bool isAuthenticated;
  final bool hasOrg;
  final String? error;

  const AuthState({this.user, this.isAuthenticated = false, this.hasOrg = false, this.error});
}

// ── Notifier ─────────────────────────────────────────────────
class AuthNotifier extends AsyncNotifier<AuthState> {
  final _api     = ApiClient();
  final _storage = StorageService();

  @override
  Future<AuthState> build() async {
    _api.init();
    // When a token refresh fails, signal the router to go back to /login.
    _api.onSessionExpired = () {
      state = const AsyncData(AuthState(isAuthenticated: false));
    };
    try {
      // 3-second timeout guards against flutter_secure_storage hanging
      // on Android emulators where the Keystore isn't fully initialized.
      final userData = await _storage.getUserData()
          .timeout(const Duration(seconds: 3), onTimeout: () => null);
      if (userData == null) return const AuthState(isAuthenticated: false);

      final user  = AppUser.fromJsonString(userData);
      final orgId = await _storage.getActiveOrgId()
          .timeout(const Duration(seconds: 3), onTimeout: () => null);
      if (orgId != null) {
        await _api.getDashboardStats()
            .timeout(const Duration(seconds: 10));
        return AuthState(user: user, isAuthenticated: true, hasOrg: true);
      }
      // Token valid but no org selected yet
      return AuthState(user: user, isAuthenticated: true, hasOrg: false);
    } catch (_) {
      await _storage.clearAll().catchError((_) {});
    }
    return const AuthState(isAuthenticated: false);
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    try {
      final res  = await _api.login(email, password);
      final data = res.data['data'] as Map<String, dynamic>;

      // Save tokens
      await _storage.saveTokens(
        accessToken:  data['accessToken']  as String,
        refreshToken: data['refreshToken'] as String,
      );

      // Parse user
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);

      // Set active org
      if (user.organizations.isNotEmpty) {
        final orgId = user.organizations.first.id;
        await _storage.saveActiveOrgId(orgId);
      }
      await _storage.saveUserData(user.toJsonString());

      final hasOrg = user.organizations.isNotEmpty;
      state = AsyncData(AuthState(user: user, isAuthenticated: true, hasOrg: hasOrg));
    } on Exception catch (e) {
      String msg = 'Login failed. Please try again.';
      if (e.toString().contains('401')) msg = 'Invalid email or password.';
      if (e.toString().contains('Connection')) msg = 'Cannot reach server. Check your connection.';
      state = AsyncData(AuthState(isAuthenticated: false, error: msg));
    }
  }

  Future<void> logout() async {
    try { await _api.logout(); } catch (_) {}
    await _storage.clearAll();
    state = const AsyncData(AuthState(isAuthenticated: false));
  }

  Future<void> refreshSession() async {
    state = const AsyncLoading();
    state = AsyncData(await build());
  }

  Future<void> switchOrg(String orgId) async {
    await _storage.saveActiveOrgId(orgId);
    final current = state.valueOrNull;
    if (current?.user != null) {
      final updated = AppUser(
        id:            current!.user!.id,
        name:          current.user!.name,
        email:         current.user!.email,
        avatar:        current.user!.avatar,
        isSuperAdmin:  current.user!.isSuperAdmin,
        organizations: current.user!.organizations,
        activeOrgId:   orgId,
      );
      await _storage.saveUserData(updated.toJsonString());
      state = AsyncData(AuthState(user: updated, isAuthenticated: true));
    }
  }
}

final authNotifierProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
