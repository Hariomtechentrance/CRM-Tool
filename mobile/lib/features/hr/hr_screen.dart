import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class HrScreen extends ConsumerStatefulWidget {
  const HrScreen({super.key});
  @override
  ConsumerState<HrScreen> createState() => _HrScreenState();
}

class _HrScreenState extends ConsumerState<HrScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _loadingEmp  = true;
  bool _loadingAtt  = true;
  bool _loadingPay  = true;
  bool _loadingLeave = true;

  List<dynamic> _employees   = [];
  List<dynamic> _attendance  = [];
  List<dynamic> _payroll     = [];
  List<dynamic> _leaves      = [];

  final _monthFmt = DateFormat('yyyy-MM');
  DateTime _selectedMonth = DateTime.now();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _loadEmployees();
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) {
        switch (_tabs.index) {
          case 1: _loadAttendance(); break;
          case 2: _loadPayroll();    break;
          case 3: _loadLeaves();     break;
        }
      }
    });
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _loadEmployees() async {
    setState(() => _loadingEmp = true);
    try {
      final res = await ApiClient().getEmployees();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _employees = raw is List ? raw : (raw?['employees'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loadingEmp = false);
  }

  Future<void> _loadAttendance() async {
    setState(() => _loadingAtt = true);
    try {
      final res = await ApiClient().getAttendance(month: _monthFmt.format(_selectedMonth));
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _attendance = raw is List ? raw : (raw?['attendance'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loadingAtt = false);
  }

  Future<void> _loadPayroll() async {
    setState(() => _loadingPay = true);
    try {
      final res = await ApiClient().getPayroll(month: _monthFmt.format(_selectedMonth));
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _payroll = raw is List ? raw : (raw?['payroll'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loadingPay = false);
  }

  Future<void> _loadLeaves() async {
    setState(() => _loadingLeave = true);
    try {
      final res = await ApiClient().getLeaves();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _leaves = raw is List ? raw : (raw?['leaves'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loadingLeave = false);
  }

  Future<void> _pickMonth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedMonth,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialEntryMode: DatePickerEntryMode.calendarOnly,
    );
    if (picked != null) {
      if (!mounted) return;
      setState(() => _selectedMonth = DateTime(picked.year, picked.month));
      if (_tabs.index == 1) _loadAttendance();
      if (_tabs.index == 2) _loadPayroll();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('HR & Payroll'),
        actions: [
          // Month selector for attendance/payroll
          TextButton.icon(
            onPressed: _pickMonth,
            icon: const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.info),
            label: Text(DateFormat('MMM yyyy').format(_selectedMonth),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.info)),
          ),
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            onPressed: () async {
              final result = await context.push<bool>('/hr/employee/add');
              if (result == true) _loadEmployees();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: AppColors.info,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.info,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Employees'), Tab(text: 'Attendance'), Tab(text: 'Payroll'), Tab(text: 'Leaves')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildEmployees(),
        _buildAttendance(),
        _buildPayroll(),
        _buildLeaves(),
      ]),
    );
  }

  // ── Employees tab ────────────────────────────────────────
  Widget _buildEmployees() {
    if (_loadingEmp) return const Center(child: CircularProgressIndicator(color: AppColors.info));
    if (_employees.isEmpty) return EmptyState(
      icon: Icons.badge_outlined,
      message: 'No employees',
      subtitle: 'Add your first employee',
      actionLabel: 'Add Employee',
      onAction: () async {
        final result = await context.push<bool>('/hr/employee/add');
        if (result == true) _loadEmployees();
      },
    );
    return RefreshIndicator(
      color: AppColors.info,
      onRefresh: _loadEmployees,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
        itemCount: _employees.length,
        itemBuilder: (_, i) {
          final emp    = _employees[i] as Map<String, dynamic>;
          final dept   = emp['department'] as String? ?? 'General';
          final status = emp['status'] as String? ?? 'ACTIVE';
          final salary = (emp['salary'] as num? ?? 0).toDouble();
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: ListTile(
              onTap: () async {
                final result = await context.push<bool>('/hr/employee/${emp['id']}', extra: emp);
                if (result == true) _loadEmployees();
              },
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              leading: CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.info.withValues(alpha: 0.12),
                child: Text(
                  (emp['name'] as String? ?? 'E').isNotEmpty ? (emp['name'] as String)[0].toUpperCase() : 'E',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.info),
                ),
              ),
              title: Text(emp['name'] as String? ?? 'Employee',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              subtitle: Text('$dept • ${emp['designation'] ?? ''}',
                style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
              trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: status == 'ACTIVE' ? AppColors.success.withValues(alpha: 0.1) : AppColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                    color: status == 'ACTIVE' ? AppColors.success : AppColors.danger)),
                ),
                if (salary > 0) ...[
                  const SizedBox(height: 2),
                  Text('₹${salary.toStringAsFixed(0)}/mo',
                    style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                ],
              ]),
            ),
          );
        },
      ),
    );
  }

  // ── Attendance tab ───────────────────────────────────────
  Widget _buildAttendance() {
    if (_loadingAtt) return const Center(child: CircularProgressIndicator(color: AppColors.info));
    if (_attendance.isEmpty) return EmptyState(
      icon: Icons.access_time_outlined,
      message: 'No attendance records',
      subtitle: 'for ${DateFormat('MMMM yyyy').format(_selectedMonth)}',
    );
    final present = _attendance.where((a) => a['status'] == 'PRESENT').length;
    final absent  = _attendance.where((a) => a['status'] == 'ABSENT').length;
    final late    = _attendance.where((a) => a['status'] == 'LATE').length;

    return RefreshIndicator(
      color: AppColors.info,
      onRefresh: _loadAttendance,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 80), children: [
        // Summary
        Row(children: [
          Expanded(child: _attStat('Present', present, AppColors.success)),
          const SizedBox(width: 8),
          Expanded(child: _attStat('Absent', absent, AppColors.danger)),
          const SizedBox(width: 8),
          Expanded(child: _attStat('Late', late, AppColors.warning)),
        ]),
        const SizedBox(height: 16),
        ..._attendance.map((a) {
          final att    = a as Map<String, dynamic>;
          final status = att['status'] as String? ?? 'PRESENT';
          final c      = status == 'PRESENT' ? AppColors.success : status == 'ABSENT' ? AppColors.danger : AppColors.warning;
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: Icon(status == 'PRESENT' ? Icons.check : status == 'ABSENT' ? Icons.close : Icons.access_time,
                  size: 18, color: c),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(att['employeeName'] as String? ?? att['employee']?['name'] as String? ?? 'Employee',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(att['date'] as String? ?? '',
                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: c)),
                ),
                if (att['checkIn'] != null)
                  Text('${att['checkIn']} – ${att['checkOut'] ?? '—'}',
                    style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
              ]),
            ]),
          );
        }),
      ]),
    );
  }

  // ── Payroll tab ──────────────────────────────────────────
  Widget _buildPayroll() {
    if (_loadingPay) return const Center(child: CircularProgressIndicator(color: AppColors.warning));
    if (_payroll.isEmpty) return EmptyState(
      icon: Icons.payments_outlined,
      message: 'No payroll records',
      subtitle: 'for ${DateFormat('MMMM yyyy').format(_selectedMonth)}',
    );
    final totalPay = _payroll.fold<double>(0, (s, p) => s + ((p['netSalary'] as num? ?? p['amount'] as num? ?? 0).toDouble()));
    return RefreshIndicator(
      color: AppColors.warning,
      onRefresh: _loadPayroll,
      child: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 80), children: [
        Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.warning, Color(0xFFD97706)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(children: [
            const Icon(Icons.payments_outlined, color: Colors.white70, size: 28),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Total Payroll', style: TextStyle(fontSize: 11, color: Colors.white70)),
              Text('₹${totalPay.toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            ]),
            const Spacer(),
            Text('${_payroll.length}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(width: 4),
            const Text('employees', style: TextStyle(fontSize: 11, color: Colors.white70)),
          ]),
        ),
        ..._payroll.map((p) {
          final pay    = p as Map<String, dynamic>;
          final net    = (pay['netSalary'] as num? ?? pay['amount'] as num? ?? 0).toDouble();
          final status = pay['status'] as String? ?? 'PENDING';
          final sc     = status == 'PAID' ? AppColors.success : status == 'PENDING' ? AppColors.warning : AppColors.danger;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.warning.withValues(alpha: 0.12),
                child: Text(
                  (pay['employeeName'] as String? ?? 'E').isNotEmpty ? (pay['employeeName'] as String)[0].toUpperCase() : 'E',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.warning),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(pay['employeeName'] as String? ?? pay['employee']?['name'] as String? ?? 'Employee',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(pay['designation'] as String? ?? '',
                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('₹${net.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: sc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: sc)),
                ),
              ]),
            ]),
          );
        }),
      ]),
    );
  }

  // ── Leaves tab ───────────────────────────────────────────
  Widget _buildLeaves() {
    if (_loadingLeave) return const Center(child: CircularProgressIndicator(color: AppColors.success));
    if (_leaves.isEmpty) return EmptyState(
      icon: Icons.event_available_outlined,
      message: 'No leave requests',
      subtitle: 'All leave requests will appear here',
    );
    return RefreshIndicator(
      color: AppColors.success,
      onRefresh: _loadLeaves,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
        itemCount: _leaves.length,
        itemBuilder: (_, i) {
          final leave  = _leaves[i] as Map<String, dynamic>;
          final status = leave['status'] as String? ?? 'PENDING';
          final type   = leave['type']   as String? ?? 'CASUAL';
          final sc     = status == 'APPROVED' ? AppColors.success : status == 'REJECTED' ? AppColors.danger : AppColors.warning;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(leave['employeeName'] as String? ?? leave['employee']?['name'] as String? ?? 'Employee',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(color: sc.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: sc)),
                ),
              ]),
              const SizedBox(height: 6),
              Row(children: [
                _leaveChip(type, AppColors.info),
                const SizedBox(width: 8),
                Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textGhost),
                const SizedBox(width: 4),
                Text('${leave['startDate'] ?? ''} – ${leave['endDate'] ?? ''}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                const Spacer(),
                if (leave['days'] != null)
                  Text('${leave['days']} day(s)',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSec)),
              ]),
              if (leave['reason'] != null) ...[
                const SizedBox(height: 6),
                Text(leave['reason'] as String,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSec)),
              ],
              // Approve / Reject for pending
              if (status == 'PENDING') ...[
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: OutlinedButton(
                    onPressed: () => _updateLeave(leave['id'] as String, 'REJECTED'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                      minimumSize: const Size(0, 34),
                    ),
                    child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: ElevatedButton(
                    onPressed: () => _updateLeave(leave['id'] as String, 'APPROVED'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success, foregroundColor: Colors.white,
                      minimumSize: const Size(0, 34),
                    ),
                    child: const Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  )),
                ]),
              ],
            ]),
          );
        },
      ),
    );
  }

  Future<void> _updateLeave(String id, String status) async {
    try {
      await ApiClient().updateLeave(id, {'status': status});
      _loadLeaves();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to update leave'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Widget _attStat(String label, int count, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
    decoration: BoxDecoration(
      color: c.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: c.withValues(alpha: 0.2)),
    ),
    child: Column(children: [
      Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: c)),
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
    ]),
  );

  Widget _leaveChip(String label, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
    child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: c)),
  );
}
