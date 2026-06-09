import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/theme.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});
  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        actions: [
          IconButton(icon: const Icon(Icons.download_outlined), onPressed: _cs),
          IconButton(icon: const Icon(Icons.calendar_today_outlined), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: AppColors.info,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.info,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Sales'), Tab(text: 'Finance'), Tab(text: 'CRM'), Tab(text: 'Inventory')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildSalesReport(),
        _buildFinanceReport(),
        _buildCrmReport(),
        _buildInventoryReport(),
      ]),
    );
  }

  Widget _buildSalesReport() => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Revenue Trend – Last 6 Months', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 12),
    _chartCard(LineChart(LineChartData(
      lineBarsData: [
        LineChartBarData(
          spots: const [FlSpot(0,2.4), FlSpot(1,3.1), FlSpot(2,2.8), FlSpot(3,4.2), FlSpot(4,3.9), FlSpot(5,5.1)],
          isCurved: true,
          color: AppColors.warning,
          barWidth: 3,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(show: true, color: AppColors.warning.withOpacity(0.08)),
        ),
      ],
      titlesData: FlTitlesData(
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (v, _) => Text(
            ['Jan','Feb','Mar','Apr','May','Jun'][v.toInt()],
            style: const TextStyle(fontSize: 10, color: AppColors.textGhost),
          ),
        )),
      ),
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 1),
      ),
      borderData: FlBorderData(show: false),
    ))),
    const SizedBox(height: 20),
    const Text('Monthly Orders', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 12),
    _chartCard(BarChart(BarChartData(
      barGroups: List.generate(6, (i) => BarChartGroupData(x: i, barRods: [
        BarChartRodData(
          toY: [24, 31, 28, 42, 39, 51][i].toDouble(),
          color: AppColors.primary,
          width: 18,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ])),
      titlesData: FlTitlesData(
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (v, _) => Text(
            ['J','F','M','A','M','J'][v.toInt()],
            style: const TextStyle(fontSize: 10, color: AppColors.textGhost),
          ),
        )),
      ),
      borderData: FlBorderData(show: false),
      gridData: const FlGridData(show: false),
    ))),
    const SizedBox(height: 20),
    _kpiRow([
      _kpi('Total Revenue', '₹51.2L', AppColors.warning),
      _kpi('Orders',        '215',    AppColors.primary),
      _kpi('Avg. Order',    '₹23.8K', AppColors.success),
    ]),
  ]);

  Widget _buildFinanceReport() => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('P&L Summary', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 12),
    _chartCard(PieChart(PieChartData(
      sections: [
        PieChartSectionData(value: 68, color: AppColors.success,   title: 'Revenue\n68%', radius: 80, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
        PieChartSectionData(value: 22, color: AppColors.warning,   title: 'COGS\n22%',    radius: 80, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
        PieChartSectionData(value: 10, color: AppColors.danger,    title: 'Opex\n10%',    radius: 80, titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
      ],
      sectionsSpace: 2,
      centerSpaceRadius: 40,
    ))),
    const SizedBox(height: 20),
    _kpiRow([
      _kpi('Revenue',    '₹51.2L', AppColors.success),
      _kpi('Expenses',   '₹16.3L', AppColors.danger),
      _kpi('Net Profit', '₹34.9L', AppColors.primary),
    ]),
  ]);

  Widget _buildCrmReport() => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Lead Funnel', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 12),
    _chartCard(BarChart(BarChartData(
      barGroups: [
        BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 142, color: AppColors.info,      width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))]),
        BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 89,  color: AppColors.primary,   width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))]),
        BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 54,  color: AppColors.warning,   width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))]),
        BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 31,  color: AppColors.secondary, width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))]),
        BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 18,  color: AppColors.success,   width: 28, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))]),
      ],
      titlesData: FlTitlesData(
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (v, _) => Text(
            ['New','Contacted','Qualified','Proposal','Won'][v.toInt()],
            style: const TextStyle(fontSize: 9, color: AppColors.textGhost),
          ),
        )),
      ),
      borderData: FlBorderData(show: false),
      gridData: const FlGridData(show: false),
    ))),
    const SizedBox(height: 20),
    _kpiRow([
      _kpi('Total Leads',   '142',  AppColors.info),
      _kpi('Conversion',    '12.7%',AppColors.success),
      _kpi('Pipeline Val.', '₹8.4L',AppColors.warning),
    ]),
  ]);

  Widget _buildInventoryReport() => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Stock Movement Trend', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 12),
    _chartCard(LineChart(LineChartData(
      lineBarsData: [
        LineChartBarData(
          spots: const [FlSpot(0,120), FlSpot(1,95), FlSpot(2,140), FlSpot(3,88), FlSpot(4,162), FlSpot(5,135)],
          isCurved: true,
          color: AppColors.success,
          barWidth: 3,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(show: true, color: AppColors.success.withOpacity(0.08)),
        ),
        LineChartBarData(
          spots: const [FlSpot(0,80), FlSpot(1,110), FlSpot(2,75), FlSpot(3,120), FlSpot(4,90), FlSpot(5,105)],
          isCurved: true,
          color: AppColors.danger,
          barWidth: 3,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(show: true, color: AppColors.danger.withOpacity(0.05)),
        ),
      ],
      titlesData: FlTitlesData(
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(
          showTitles: true,
          getTitlesWidget: (v, _) => Text(
            ['Jan','Feb','Mar','Apr','May','Jun'][v.toInt()],
            style: const TextStyle(fontSize: 10, color: AppColors.textGhost),
          ),
        )),
      ),
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        getDrawingHorizontalLine: (_) => const FlLine(color: AppColors.border, strokeWidth: 1),
      ),
      borderData: FlBorderData(show: false),
    ))),
    const SizedBox(height: 8),
    Row(children: [
      _legend('Stock In', AppColors.success),
      const SizedBox(width: 16),
      _legend('Stock Out', AppColors.danger),
    ]),
  ]);

  Widget _chartCard(Widget chart) => Container(
    height: 220,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.cardLight,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: chart,
  );

  Widget _kpiRow(List<Widget> items) => Row(
    children: items.map((w) => Expanded(child: Padding(padding: const EdgeInsets.only(right: 8), child: w))).toList(),
  );

  Widget _kpi(String label, String value, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
    decoration: BoxDecoration(
      color: c.withOpacity(0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: c.withOpacity(0.2)),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: c)),
      const SizedBox(height: 2),
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
    ]),
  );

  Widget _legend(String label, Color c) => Row(children: [
    Container(width: 12, height: 3, color: c),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
  ]);
}
