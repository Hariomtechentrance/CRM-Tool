import 'dart:convert';

class Organization {
  final String id;
  final String name;
  final String slug;
  final String role;
  final String? logo;
  final String currency;
  final List<String> enabledModules;

  const Organization({
    required this.id,
    required this.name,
    required this.slug,
    required this.role,
    this.logo,
    this.currency = 'INR',
    this.enabledModules = const [],
  });

  factory Organization.fromJson(Map<String, dynamic> j) => Organization(
    id:             j['id'] as String,
    name:           j['name'] as String,
    slug:           j['slug'] as String? ?? '',
    role:           j['role'] as String? ?? 'MEMBER',
    logo:           j['logo'] as String?,
    currency:       j['currency'] as String? ?? 'INR',
    enabledModules: List<String>.from(j['enabledModules'] ?? []),
  );
}

class AppUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatar;
  final bool isSuperAdmin;
  final List<Organization> organizations;
  final String activeOrgId;

  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.isSuperAdmin = false,
    required this.organizations,
    required this.activeOrgId,
  });

  bool get isAuthenticated => id.isNotEmpty;

  Organization? get activeOrg =>
      organizations.where((o) => o.id == activeOrgId).firstOrNull;

  factory AppUser.fromJson(Map<String, dynamic> j) {
    final orgs = (j['organizations'] as List? ?? [])
        .map((o) => Organization.fromJson(o as Map<String, dynamic>))
        .toList();
    return AppUser(
      id:           j['id'] as String,
      name:         j['name'] as String,
      email:        j['email'] as String,
      phone:        j['phone'] as String?,
      avatar:       j['avatar'] as String?,
      isSuperAdmin: j['isSuperAdmin'] as bool? ?? false,
      organizations: orgs,
      activeOrgId:  orgs.isNotEmpty ? orgs.first.id : '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'email': email,
    'phone': phone, 'avatar': avatar, 'isSuperAdmin': isSuperAdmin,
    'organizations': organizations.map((o) => {
      'id': o.id, 'name': o.name, 'slug': o.slug,
      'role': o.role, 'logo': o.logo, 'currency': o.currency,
      'enabledModules': o.enabledModules,
    }).toList(),
    'activeOrgId': activeOrgId,
  };

  String toJsonString() => jsonEncode(toJson());

  factory AppUser.fromJsonString(String s) => AppUser.fromJson(jsonDecode(s) as Map<String, dynamic>);
}
