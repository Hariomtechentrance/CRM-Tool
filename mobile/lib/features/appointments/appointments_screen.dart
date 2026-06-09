import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/fc_button.dart';

class AppointmentsScreen extends ConsumerStatefulWidget {
  const AppointmentsScreen({super.key});
  @override
  ConsumerState<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends ConsumerState<AppointmentsScreen> {
  DateTime _selectedDay = DateTime.now();
  bool _loading     = true;
  List<dynamic> _all = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getAppointments();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _all = raw is List ? raw : (raw?['appointments'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  bool _isToday(dynamic a) {
    final ds = (a as Map<String, dynamic>)['date'] as String? ?? a['scheduledAt'] as String? ?? '';
    if (ds.isEmpty) return false;
    try {
      final d = DateTime.parse(ds);
      final now = DateTime.now();
      return d.year == now.year && d.month == now.month && d.day == now.day;
    } catch (_) { return false; }
  }

  bool _isOnDay(dynamic a, DateTime day) {
    final ds = (a as Map<String, dynamic>)['date'] as String? ?? a['scheduledAt'] as String? ?? '';
    if (ds.isEmpty) return false;
    try {
      final d = DateTime.parse(ds);
      return d.year == day.year && d.month == day.month && d.day == day.day;
    } catch (_) { return false; }
  }

  Color _typeColor(String? t) {
    switch (t) {
      case 'MEETING':    return AppColors.primary;
      case 'DEMO':       return AppColors.secondary;
      case 'CALL':       return AppColors.success;
      case 'SITE_VISIT': return AppColors.warning;
      case 'TRAINING':   return AppColors.info;
      default:           return AppColors.textGhost;
    }
  }

  IconData _typeIcon(String? t) {
    switch (t) {
      case 'MEETING':    return Icons.people_outline;
      case 'DEMO':       return Icons.screen_share_outlined;
      case 'CALL':       return Icons.phone_outlined;
      case 'SITE_VISIT': return Icons.location_on_outlined;
      case 'TRAINING':   return Icons.school_outlined;
      default:           return Icons.event_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _all.where((a) => _isOnDay(a, _selectedDay)).toList();
    final today    = _all.where((a) => _isToday(a)).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Appointments'),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () => _addDialog(context)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 80), children: [
                // ── Week strip ────────────────────────────────────
                _WeekStrip(selected: _selectedDay, onSelect: (d) => setState(() => _selectedDay = d)),
                const SizedBox(height: 20),

                // ── Selected day ──────────────────────────────────
                Text(
                  DateFormat('EEEE, d MMMM').format(_selectedDay) == DateFormat('EEEE, d MMMM').format(DateTime.now())
                      ? "Today's Appointments" : DateFormat('EEEE, d MMMM').format(_selectedDay),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                if (selected.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text('No appointments on this day', style: TextStyle(color: AppColors.textGhost, fontSize: 13)),
                  )
                else
                  ...selected.map((a) => _ApptCard(a: a as Map<String, dynamic>, typeColor: _typeColor, typeIcon: _typeIcon, onDelete: () => _deleteAppt(a))),

                // ── Upcoming ──────────────────────────────────────
                if (_all.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  const Text('All Appointments', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  const SizedBox(height: 10),
                  ..._all.map((a) => _ApptCard(a: a as Map<String, dynamic>, typeColor: _typeColor, typeIcon: _typeIcon, onDelete: () => _deleteAppt(a))),
                ],
              ]),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _addDialog(context),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Schedule', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Future<void> _addDialog(BuildContext context) async {
    final titleCtrl = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Schedule Appointment'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
            controller: titleCtrl,
            autofocus: true,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Title *'),
          ),
        ]),
        actions: [
          TextButton(onPressed: () { titleCtrl.dispose(); Navigator.pop(context, false); }, child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () { Navigator.pop(context, true); },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (result != true || titleCtrl.text.trim().isEmpty) { titleCtrl.dispose(); return; }
    try {
      await ApiClient().createAppointment({
        'title': titleCtrl.text.trim(),
        'date':  _selectedDay.toIso8601String(),
        'type':  'MEETING',
        'status':'CONFIRMED',
      });
      _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to schedule appointment'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
    titleCtrl.dispose();
  }

  Future<void> _deleteAppt(Map<String, dynamic> a) async {
    try {
      await ApiClient().deleteAppointment(a['id'] as String);
      _load();
    } catch (_) {}
  }
}

class _WeekStrip extends StatelessWidget {
  final DateTime selected;
  final ValueChanged<DateTime> onSelect;
  const _WeekStrip({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days  = List.generate(7, (i) => today.add(Duration(days: i - 1)));
    return Row(
      children: days.map((d) {
        final isSelected = d.day == selected.day && d.month == selected.month;
        final isToday    = d.day == today.day && d.month == today.month;
        return Expanded(
          child: GestureDetector(
            onTap: () => onSelect(d),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : isToday ? AppColors.primary.withOpacity(0.08) : AppColors.cardLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
              ),
              child: Column(children: [
                Text(DateFormat('EEE').format(d),
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.textGhost)),
                const SizedBox(height: 2),
                Text(DateFormat('d').format(d),
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800,
                    color: isSelected ? Colors.white : isToday ? AppColors.primary : AppColors.textPrimary)),
              ]),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ApptCard extends StatelessWidget {
  final Map<String, dynamic> a;
  final Color Function(String?) typeColor;
  final IconData Function(String?) typeIcon;
  final VoidCallback onDelete;
  const _ApptCard({required this.a, required this.typeColor, required this.typeIcon, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final type   = a['type']   as String?;
    final status = a['status'] as String? ?? 'PENDING';
    final c      = typeColor(type);
    final time   = a['time']   as String? ?? (a['scheduledAt'] != null
        ? DateFormat('hh:mm a').format(DateTime.parse(a['scheduledAt'] as String))
        : '');
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        Container(width: 4, height: 72,
          decoration: BoxDecoration(color: c, borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)))),
        Expanded(child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (time.isNotEmpty) Text(time, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: c)),
            const SizedBox(height: 2),
            Text(a['title'] as String? ?? 'Appointment',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Row(children: [
              Icon(typeIcon(type), size: 12, color: AppColors.textGhost),
              const SizedBox(width: 3),
              Text(type ?? '', style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: (status == 'CONFIRMED' ? AppColors.success : AppColors.warning).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                  color: status == 'CONFIRMED' ? AppColors.success : AppColors.warning)),
              ),
            ]),
          ]),
        )),
        IconButton(
          icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.textGhost),
          onPressed: onDelete,
        ),
      ]),
    );
  }
}
