import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';

class GstScreen extends ConsumerStatefulWidget {
  const GstScreen({super.key});
  @override
  ConsumerState<GstScreen> createState() => _GstScreenState();
}

class _GstScreenState extends ConsumerState<GstScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _loading = true;
  Map<String, dynamic> _summary = {};
  final _fmt = NumberFormat('#,##,###', 'en_IN');

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/gst/summary');
      if (!mounted) return;
      setState(() => _summary = res.data['data'] as Map<String, dynamic>? ?? {});
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('GST Reports'),
        actions: [
          IconButton(icon: const Icon(Icons.download_outlined), onPressed: _cs),
          IconButton(icon: const Icon(Icons.calendar_today_outlined), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: AppColors.success,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.success,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'GSTR-1'), Tab(text: 'GSTR-3B'), Tab(text: 'GSTR-2A'), Tab(text: 'Summary')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        _GstrTab(title: 'GSTR-1', subtitle: 'Outward Supplies (Sales)', items: _mockGstr1()),
        _GstrTab(title: 'GSTR-3B', subtitle: 'Monthly Return Summary', items: _mockGstr3b()),
        _GstrTab(title: 'GSTR-2A', subtitle: 'Inward Supplies (Purchases)', items: _mockGstr2a()),
        _buildSummary(),
      ]),
    );
  }

  Widget _buildSummary() => ListView(padding: const EdgeInsets.all(16), children: [
    _GstCard('Total Taxable Value', '₹${_fmt.format(_summary['taxableValue'] ?? 1250000)}', Icons.account_balance_outlined, AppColors.success),
    const SizedBox(height: 10),
    _GstCard('Total CGST',  '₹${_fmt.format(_summary['cgst']  ?? 56250)}', Icons.percent, AppColors.primary),
    const SizedBox(height: 10),
    _GstCard('Total SGST',  '₹${_fmt.format(_summary['sgst']  ?? 56250)}', Icons.percent, AppColors.info),
    const SizedBox(height: 10),
    _GstCard('Total IGST',  '₹${_fmt.format(_summary['igst']  ?? 22500)}', Icons.percent, AppColors.warning),
    const SizedBox(height: 10),
    _GstCard('Net Payable', '₹${_fmt.format(_summary['netPayable'] ?? 135000)}', Icons.payment_outlined, AppColors.danger),
  ]);

  List<Map<String, dynamic>> _mockGstr1() => [
    {'period': 'May 2026',   'taxable': 850000,  'tax': 135000, 'status': 'FILED'},
    {'period': 'April 2026', 'taxable': 720000,  'tax': 112000, 'status': 'FILED'},
    {'period': 'March 2026', 'taxable': 940000,  'tax': 148000, 'status': 'PENDING'},
    {'period': 'Feb 2026',   'taxable': 680000,  'tax': 98000,  'status': 'FILED'},
  ];

  List<Map<String, dynamic>> _mockGstr3b() => [
    {'period': 'May 2026',   'tax': 135000, 'paid': 135000, 'status': 'FILED'},
    {'period': 'April 2026', 'tax': 112000, 'paid': 112000, 'status': 'FILED'},
    {'period': 'March 2026', 'tax': 148000, 'paid': 0,      'status': 'PENDING'},
  ];

  List<Map<String, dynamic>> _mockGstr2a() => [
    {'period': 'May 2026',   'taxable': 320000, 'tax': 48000,  'status': 'AVAILABLE'},
    {'period': 'April 2026', 'taxable': 280000, 'tax': 38000,  'status': 'AVAILABLE'},
    {'period': 'March 2026', 'taxable': 410000, 'tax': 62000,  'status': 'AVAILABLE'},
  ];
}

class _GstrTab extends StatelessWidget {
  final String title, subtitle;
  final List<Map<String, dynamic>> items;
  const _GstrTab({required this.title, required this.subtitle, required this.items});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##,###', 'en_IN');
    return Column(children: [
      Container(
        width: double.infinity,
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.white70)),
        ]),
      ),
      Expanded(
        child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: items.length,
          itemBuilder: (_, i) {
            final item = items[i];
            final filed = item['status'] == 'FILED' || item['status'] == 'AVAILABLE';
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: filed ? AppColors.success.withOpacity(0.1) : AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      filed ? Icons.check_circle_outline : Icons.schedule_outlined,
                      size: 18,
                      color: filed ? AppColors.success : AppColors.warning,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(item['period'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                    Text('Taxable: ₹${fmt.format(item['taxable'] ?? 0)}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                  ])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('₹${fmt.format(item['tax'] ?? 0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: (filed ? AppColors.success : AppColors.warning).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(item['status'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: filed ? AppColors.success : AppColors.warning)),
                    ),
                  ]),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
  }
}

class _GstCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _GstCard(this.label, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Row(children: [
      Container(
        width: 40, height: 40,
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 20, color: color),
      ),
      const SizedBox(width: 12),
      Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSec))),
      Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color)),
    ]),
  );
}
