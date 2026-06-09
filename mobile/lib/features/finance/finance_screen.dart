import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});
  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _loading = true;
  List<dynamic> _invoices = [];
  Map<String, dynamic> _summary = {};
  String _statusFilter = 'ALL';

  final _fmt = NumberFormat('#,##,###', 'en_IN');

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getFinanceSummary();
      final data = res.data['data'] as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _summary  = data['summary'] as Map<String, dynamic>? ?? data;
        _invoices = data['invoices'] as List? ?? data['recentInvoices'] as List? ?? [];
      });
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'PAID':      return AppColors.success;
      case 'SENT':      return AppColors.primary;
      case 'OVERDUE':   return AppColors.danger;
      case 'DRAFT':     return AppColors.textGhost;
      default:          return AppColors.textSec;
    }
  }

  List<dynamic> get _filtered => _statusFilter == 'ALL'
      ? _invoices
      : _invoices.where((i) => i['status'] == _statusFilter).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Finance'),
        actions: [
          IconButton(icon: const Icon(Icons.download_outlined), onPressed: _cs),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await context.push<bool>('/finance/invoice/create');
              if (result == true) _load();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.primary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Invoices'),
            Tab(text: 'Payments'),
          ],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Overview tab ────────────────────────────────────────
        _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _buildOverview(),

        // ── Invoices tab ────────────────────────────────────────
        _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _buildInvoices(),

        // ── Payments tab ────────────────────────────────────────
        const Center(child: Text('Payments coming soon', style: TextStyle(color: AppColors.textGhost))),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await context.push<bool>('/finance/invoice/create');
          if (result == true) _load();
        },
        backgroundColor: AppColors.danger,
        icon: const Icon(Icons.receipt_long, color: Colors.white),
        label: const Text('New Invoice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildOverview() => ListView(padding: const EdgeInsets.all(16), children: [
    // Summary cards
    GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10, mainAxisSpacing: 10,
      childAspectRatio: 1.5,
      children: [
        _SummaryCard(label: 'Total Revenue', value: '₹${_fmt.format(_summary['totalRevenue'] ?? 0)}', icon: Icons.trending_up, color: AppColors.success),
        _SummaryCard(label: 'Outstanding',   value: '₹${_fmt.format(_summary['outstanding'] ?? 0)}',  icon: Icons.pending_outlined, color: AppColors.warning),
        _SummaryCard(label: 'Overdue',       value: '₹${_fmt.format(_summary['overdue'] ?? 0)}',      icon: Icons.warning_outlined,  color: AppColors.danger),
        _SummaryCard(label: 'Total Paid',    value: '₹${_fmt.format(_summary['totalPaid'] ?? 0)}',    icon: Icons.check_circle_outline, color: AppColors.primary),
      ],
    ),
    const SizedBox(height: 20),
    const Text('Recent Invoices', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 10),
    ..._invoices.take(5).map((inv) => _InvoiceTile(invoice: inv as Map<String, dynamic>, statusColor: _statusColor)),
  ]);

  Widget _buildInvoices() => Column(children: [
    // Filter
    SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        children: ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map((s) {
          final sel = _statusFilter == s;
          final c   = s == 'ALL' ? AppColors.primary : _statusColor(s);
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ChoiceChip(
              label: Text(s, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: sel ? Colors.white : c)),
              selected: sel,
              onSelected: (_) => setState(() => _statusFilter = s),
              backgroundColor: c.withOpacity(0.08),
              selectedColor: c,
              showCheckmark: false,
              side: BorderSide(color: c.withOpacity(0.3)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }).toList(),
      ),
    ),
    Expanded(
      child: _filtered.isEmpty
          ? EmptyState(icon: Icons.receipt_long_outlined, message: 'No invoices', subtitle: 'Create your first invoice')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                itemCount: _filtered.length,
                itemBuilder: (_, i) => _InvoiceTile(invoice: _filtered[i] as Map<String, dynamic>, statusColor: _statusColor),
              ),
            ),
    ),
  ]);
}

class _SummaryCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _SummaryCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Container(
        width: 32, height: 32,
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 16, color: color),
      ),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
      ]),
    ]),
  );
}

class _InvoiceTile extends StatelessWidget {
  final Map<String, dynamic> invoice;
  final Color Function(String?) statusColor;
  const _InvoiceTile({required this.invoice, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    final status = invoice['status'] as String? ?? 'DRAFT';
    final color  = statusColor(status);
    final total  = (invoice['totalAmount'] as num? ?? invoice['total'] as num? ?? 0).toDouble();
    final party  = invoice['party']?['name'] as String? ?? invoice['partyName'] as String? ?? 'Unknown';
    final number = invoice['invoiceNumber'] as String? ?? invoice['number'] as String? ?? '#';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        onTap: () => context.push('/finance/invoice/${invoice['id']}'),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(Icons.receipt_long, size: 18, color: color),
        ),
        title: Text(number, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        subtitle: Text(party, style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('₹${total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
          ),
        ]),
      ),
    );
  }
}
