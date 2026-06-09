import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

final _teamProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await ApiClient().getTeamMembers();
  final raw = res.data['data'];
  return raw is List ? raw : (raw?['members'] as List? ?? []);
});

class TeamManagementScreen extends ConsumerWidget {
  const TeamManagementScreen({super.key});

  Color _roleColor(String? role) {
    switch (role?.toUpperCase()) {
      case 'OWNER':   return AppColors.danger;
      case 'ADMIN':   return AppColors.primary;
      case 'MANAGER': return AppColors.warning;
      default:        return AppColors.textSec;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final team = ref.watch(_teamProvider);

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Team Members'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            tooltip: 'Invite Member',
            onPressed: () => _inviteDialog(context),
          ),
        ],
      ),
      body: team.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error:   (e, _) => EmptyState(
          icon: Icons.people_outline,
          message: 'Unable to load team',
          subtitle: 'Check your connection and try again',
          actionLabel: 'Retry',
          onAction: () => ref.invalidate(_teamProvider),
        ),
        data: (members) => members.isEmpty
            ? EmptyState(
                icon: Icons.group_outlined,
                message: 'No team members yet',
                subtitle: 'Invite your team to collaborate',
                actionLabel: 'Invite Member',
                onAction: () => _inviteDialog(context),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                itemCount: members.length,
                itemBuilder: (_, i) {
                  final m    = members[i] as Map<String, dynamic>;
                  final role = m['role'] as String? ?? 'MEMBER';
                  final rc   = _roleColor(role);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: AppColors.cardLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      leading: CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.primary.withOpacity(0.1),
                        child: Text(
                          (m['name'] as String? ?? m['user']?['name'] as String? ?? 'M').isNotEmpty
                              ? (m['name'] as String? ?? m['user']?['name'] as String? ?? 'M')[0].toUpperCase()
                              : 'M',
                          style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ),
                      title: Text(
                        m['name'] as String? ?? m['user']?['name'] as String? ?? 'Member',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        m['email'] as String? ?? m['user']?['email'] as String? ?? '',
                        style: const TextStyle(fontSize: 11, color: AppColors.textGhost),
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: rc.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(role, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: rc)),
                      ),
                    ),
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _inviteDialog(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_outlined, color: Colors.white),
        label: const Text('Invite', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  void _inviteDialog(BuildContext context) {
    final emailCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Invite Team Member'),
        content: TextField(
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter email address',
            prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textGhost),
          ),
        ),
        actions: [
          TextButton(onPressed: () { emailCtrl.dispose(); Navigator.pop(context); }, child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              emailCtrl.dispose();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Invitation sent'),
                backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
              ));
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            child: const Text('Send Invite'),
          ),
        ],
      ),
    );
  }
}
