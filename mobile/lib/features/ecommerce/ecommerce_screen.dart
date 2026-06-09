import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';

class EcommerceScreen extends ConsumerStatefulWidget {
  const EcommerceScreen({super.key});
  @override
  ConsumerState<EcommerceScreen> createState() => _EcommerceScreenState();
}

class _EcommerceScreenState extends ConsumerState<EcommerceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  final _orders = [
    {'id': 'SHP-001', 'platform': 'Shopify',  'customer': 'Rakesh Gupta',   'amount': 2490, 'status': 'SHIPPED',    'date': '9 Jun'},
    {'id': 'FLP-001', 'platform': 'Flipkart', 'customer': 'Kavita Singh',   'amount': 1250, 'status': 'PROCESSING', 'date': '9 Jun'},
    {'id': 'AMZ-001', 'platform': 'Amazon',   'customer': 'Manish Verma',   'amount': 3800, 'status': 'DELIVERED',  'date': '8 Jun'},
    {'id': 'SHP-002', 'platform': 'Shopify',  'customer': 'Deepa Nair',     'amount': 990,  'status': 'PENDING',    'date': '8 Jun'},
    {'id': 'FLP-002', 'platform': 'Flipkart', 'customer': 'Arun Pillai',    'amount': 4200, 'status': 'SHIPPED',    'date': '7 Jun'},
  ];

  final _platforms = [
    {'name': 'Shopify',  'orders': 42, 'revenue': 85200,  'color': 0xFF96BF48, 'connected': true},
    {'name': 'Flipkart', 'orders': 28, 'revenue': 56400,  'color': 0xFFF0AD00, 'connected': true},
    {'name': 'Amazon',   'orders': 15, 'revenue': 38700,  'color': 0xFFFF9900, 'connected': false},
    {'name': 'Meesho',   'orders': 8,  'revenue': 12600,  'color': 0xFF9B4DCA, 'connected': false},
  ];

  Color _statusColor(String s) {
    switch (s) {
      case 'DELIVERED':  return AppColors.success;
      case 'SHIPPED':    return AppColors.info;
      case 'PROCESSING': return AppColors.warning;
      case 'PENDING':    return AppColors.textGhost;
      case 'CANCELLED':  return AppColors.danger;
      default:           return AppColors.textSec;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('E-commerce'),
        actions: [
          IconButton(icon: const Icon(Icons.sync_outlined), onPressed: _cs),
          IconButton(icon: const Icon(Icons.add), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.secondary,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.secondary,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Orders'), Tab(text: 'Platforms'), Tab(text: 'Products')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Orders ────────────────────────────────────────────
        ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _orders.length,
          itemBuilder: (_, i) {
            final o = _orders[i];
            final c = _statusColor(o['status'] as String);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                leading: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                  child: Center(child: Text(
                    (o['platform'] as String).substring(0, 2).toUpperCase(),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.secondary),
                  )),
                ),
                title: Text('${o['id']} • ${o['customer']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text('${o['platform']} • ${o['date']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('₹${o['amount']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  Container(
                    margin: const EdgeInsets.only(top: 2),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                    child: Text(o['status'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                  ),
                ]),
              ),
            );
          },
        ),

        // ── Platforms ────────────────────────────────────────
        ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _platforms.length,
          itemBuilder: (_, i) {
            final p = _platforms[i];
            final connected = p['connected'] as bool;
            final c = Color(p['color'] as int);
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
                    child: Icon(Icons.storefront_outlined, size: 22, color: c),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(p['name'] as String, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    if (connected)
                      Text('${p['orders']} orders • ₹${p['revenue']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost))
                    else
                      const Text('Not connected', style: TextStyle(fontSize: 11, color: AppColors.textGhost)),
                  ])),
                  connected
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.success.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                          child: const Text('CONNECTED', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.success)),
                        )
                      : ElevatedButton(
                          onPressed: _cs,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: c, foregroundColor: Colors.white,
                            minimumSize: const Size(0, 32), padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: const Text('Connect', style: TextStyle(fontSize: 11)),
                        ),
                ]),
              ),
            );
          },
        ),

        // ── Products ─────────────────────────────────────────
        const Center(child: Text('Sync your products across platforms', style: TextStyle(color: AppColors.textGhost))),
      ]),
    );
  }
}
