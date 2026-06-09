import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../features/auth/auth_notifier.dart';

class HomeScreen extends ConsumerWidget {
  final StatefulNavigationShell shell;
  const HomeScreen({super.key, required this.shell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull?.user;
    final org  = user?.activeOrg;

    return Scaffold(
      // ── Top AppBar ───────────────────────────────────────────
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(org?.name ?? 'FlowCRM',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            if (org != null)
              Text(org.role,
                style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
          ],
        ),
        actions: [
          // Notifications
          IconButton(
            icon: const Icon(Icons.notifications_outlined, size: 22),
            onPressed: () => _showNotifications(context),
          ),
          // Profile avatar
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => _showProfileSheet(context, ref, user?.name ?? 'User', user?.email ?? ''),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.primary.withOpacity(0.15),
                child: Text(
                  (user?.name.isNotEmpty == true) ? user!.name[0].toUpperCase() : 'U',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                ),
              ),
            ),
          ),
        ],
      ),

      // ── Bottom Nav ───────────────────────────────────────────
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: shell.currentIndex,
          onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Dashboard'),
            BottomNavigationBarItem(icon: Icon(Icons.people_outline),     activeIcon: Icon(Icons.people),    label: 'CRM'),
            BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined),activeIcon: Icon(Icons.inventory_2), label: 'Inventory'),
            BottomNavigationBarItem(icon: Icon(Icons.grid_view_outlined), activeIcon: Icon(Icons.grid_view), label: 'More'),
          ],
        ),
      ),

      body: shell,
    );
  }

  void _showNotifications(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        builder: (ctx, ctrl) => Column(children: [
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Notifications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: FutureBuilder<List<dynamic>>(
              future: ApiClient().getNotifications().then((r) {
                final raw = r.data['data'];
                return raw is List ? raw : (raw?['notifications'] as List? ?? []);
              }).catchError((_) => <dynamic>[]),
              builder: (_, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                }
                final items = snap.data ?? [];
                if (items.isEmpty) {
                  return const Center(
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.notifications_none_outlined, size: 48, color: AppColors.textGhost),
                      SizedBox(height: 8),
                      Text('All caught up!', style: TextStyle(color: AppColors.textGhost, fontSize: 14)),
                    ]),
                  );
                }
                return ListView.separated(
                  controller: ctrl,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, indent: 60),
                  itemBuilder: (_, i) {
                    final n = items[i] as Map<String, dynamic>;
                    final read = n['isRead'] as bool? ?? false;
                    return ListTile(
                      leading: CircleAvatar(
                        radius: 18,
                        backgroundColor: AppColors.primary.withOpacity(0.12),
                        child: const Icon(Icons.notifications_outlined, size: 16, color: AppColors.primary),
                      ),
                      title: Text(n['title'] as String? ?? 'Notification',
                        style: TextStyle(fontSize: 13, fontWeight: read ? FontWeight.w500 : FontWeight.w700)),
                      subtitle: Text(n['message'] as String? ?? n['body'] as String? ?? '',
                        style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                      tileColor: read ? null : AppColors.primary.withOpacity(0.04),
                    );
                  },
                );
              },
            ),
          ),
        ]),
      ),
    );
  }

  void _showProfileSheet(BuildContext context, WidgetRef ref, String name, String email) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.primary.withOpacity(0.15),
              child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary)),
            ),
            const SizedBox(height: 12),
            Text(name,  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(email, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
            const SizedBox(height: 20),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_outlined, color: AppColors.textSec),
              title: const Text('Settings', style: TextStyle(fontSize: 14)),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.danger),
              title: const Text('Logout', style: TextStyle(fontSize: 14, color: AppColors.danger)),
              onTap: () {
                Navigator.pop(context);
                ref.read(authNotifierProvider.notifier).logout();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
