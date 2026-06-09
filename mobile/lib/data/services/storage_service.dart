import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await Future.wait([
      _storage.write(key: AppConstants.kAccessToken,  value: accessToken),
      _storage.write(key: AppConstants.kRefreshToken, value: refreshToken),
    ]);
  }

  Future<String?> getAccessToken()  => _storage.read(key: AppConstants.kAccessToken);
  Future<String?> getRefreshToken() => _storage.read(key: AppConstants.kRefreshToken);

  Future<void> saveActiveOrgId(String orgId) =>
      _storage.write(key: AppConstants.kActiveOrgId, value: orgId);

  Future<String?> getActiveOrgId() => _storage.read(key: AppConstants.kActiveOrgId);

  Future<void> saveUserData(String json) =>
      _storage.write(key: AppConstants.kUserData, value: json);

  Future<String?> getUserData() => _storage.read(key: AppConstants.kUserData);

  Future<void> clearAll() => _storage.deleteAll();
}
