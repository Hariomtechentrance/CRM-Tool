import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../features/auth/auth_notifier.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull?.user;
    final org  = user?.activeOrg;

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // ── Profile card ──────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: AppColors.gradient,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: Colors.white.withOpacity(0.2),
              child: Text(
                (user?.name.isNotEmpty == true) ? user!.name[0].toUpperCase() : 'U',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user?.name ?? 'User', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              Text(user?.email ?? '', style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.8))),
              if (org != null) ...[
                const SizedBox(height: 2),
                Text('${org.name} • ${org.role}', style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.7))),
              ],
            ])),
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: Colors.white70),
              onPressed: () => context.push('/settings/profile'),
            ),
          ]),
        ),

        const SizedBox(height: 20),

        // ── Organization ──────────────────────────────────────
        _section('Organization', [
          _tile(Icons.business_outlined,    'Organization Profile',  AppColors.primary,   () => context.push('/settings/org')),
          _tile(Icons.people_outline,       'Team Members',          AppColors.info,      () => context.push('/settings/team')),
          _tile(Icons.extension_outlined,   'Modules & Features',    AppColors.secondary, () => context.push('/settings/modules')),
          _tile(Icons.attach_money,         'Subscription & Billing',AppColors.success,   () {}),
        ]),

        const SizedBox(height: 16),

        // ── App Settings ──────────────────────────────────────
        _section('App Settings', [
          _tile(Icons.notifications_outlined,  'Notifications',        AppColors.warning, () {}),
          _tile(Icons.language_outlined,        'Language',             AppColors.info,    () {}),
          _tile(Icons.currency_rupee,           'Currency & Units',     AppColors.primary, () {}),
          _tile(Icons.dark_mode_outlined,       'Theme',                AppColors.textSec, () {}),
        ]),

        const SizedBox(height: 16),

        // ── Data ─────────────────────────────────────────────
        _section('Data', [
          _tile(Icons.backup_outlined,    'Backup & Export',   AppColors.success, () {}),
          _tile(Icons.import_export,      'Import Data',       AppColors.primary, () {}),
          _tile(Icons.restore_outlined,   'Restore Data',      AppColors.info,    () {}),
        ]),

        const SizedBox(height: 16),

        // ── Support ───────────────────────────────────────────
        _section('Help & Support', [
          _tile(Icons.help_outline,       'Help Center',       AppColors.info,    () {}),
          _tile(Icons.chat_outlined,      'Contact Support',   AppColors.success, () {}),
          _tile(Icons.star_outline,       'Rate the App',      AppColors.warning, () {}),
          _tile(Icons.info_outline,       'About FlowCRM',     AppColors.textSec, () {}),
        ]),

        const SizedBox(height: 16),

        // ── Danger Zone ───────────────────────────────────────
        _section('Account', [
          _tile(Icons.person_outlined,  'Edit Profile',    AppColors.primary, () => context.push('/settings/profile')),
          _tile(Icons.lock_outlined,    'Change Password', AppColors.warning, () {}),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 14),
            leading: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: AppColors.danger.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.logout, size: 18, color: AppColors.danger),
            ),
            title: const Text('Sign Out', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.danger)),
            trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.danger),
            onTap: () => _confirmLogout(context, ref),
          ),
        ]),

        const SizedBox(height: 20),
        const Center(
          child: Text('FlowCRM v1.0.0', style: TextStyle(fontSize: 12, color: AppColors.textGhost)),
        ),
        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _section(String title, List<Widget> tiles) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.only(left: 4, bottom: 6),
        child: Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textGhost, letterSpacing: 0.5)),
      ),
      Container(
        decoration: BoxDecoration(
          color: AppColors.cardLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(children: tiles.asMap().entries.map((e) {
          final isLast = e.key == tiles.length - 1;
          return Column(children: [
            e.value,
            if (!isLast) const Divider(height: 1, indent: 54, color: AppColors.border),
          ]);
        }).toList()),
      ),
    ],
  );

  Widget _tile(IconData icon, String label, Color c, VoidCallback onTap) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 14),
    leading: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, size: 18, color: c),
    ),
    title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
    trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.textGhost),
    onTap: onTap,
  );

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authNotifierProvider.notifier).logout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}
