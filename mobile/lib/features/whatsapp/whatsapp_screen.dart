import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';

const _waColor = Color(0xFF25D366);

class WhatsappScreen extends ConsumerStatefulWidget {
  const WhatsappScreen({super.key});
  @override
  ConsumerState<WhatsappScreen> createState() => _WhatsappScreenState();
}

class _WhatsappScreenState extends ConsumerState<WhatsappScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  final _campaigns = [
    {'name': 'Welcome Series',      'status': 'ACTIVE',   'sent': 248, 'opened': 180, 'date': '9 Jun'},
    {'name': 'Monthly Newsletter',  'status': 'SCHEDULED','sent': 0,   'opened': 0,   'date': '15 Jun'},
    {'name': 'Order Follow-up',     'status': 'COMPLETED','sent': 120, 'opened': 98,  'date': '5 Jun'},
    {'name': 'Festival Offers',     'status': 'DRAFT',    'sent': 0,   'opened': 0,   'date': '—'},
  ];

  final _chats = [
    {'name': 'Rahul Sharma',  'msg': 'Thanks! Got the order.', 'time': '10:32 AM', 'unread': 0},
    {'name': 'Priya Industries','msg': 'When will invoice be sent?', 'time': '9:15 AM', 'unread': 2},
    {'name': 'Amit Traders',  'msg': 'Please share catalog.', 'time': 'Yesterday',  'unread': 1},
    {'name': 'Kavita Singh',  'msg': 'Order confirmed ✓', 'time': 'Yesterday',  'unread': 0},
    {'name': 'Vikram Nair',   'msg': 'Need GST invoice', 'time': '7 Jun', 'unread': 0},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('WhatsApp'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: _cs),
          IconButton(icon: const Icon(Icons.add), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: _waColor,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: _waColor,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Chats'), Tab(text: 'Campaigns'), Tab(text: 'Templates')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        // ── Chats ─────────────────────────────────────────────
        ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
          itemCount: _chats.length,
          itemBuilder: (_, i) {
            final c = _chats[i];
            final unread = c['unread'] as int;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: _waColor.withOpacity(0.15),
                  child: Text(
                    (c['name'] as String).split(' ').map((n) => n[0]).take(2).join(),
                    style: const TextStyle(fontWeight: FontWeight.w700, color: _waColor, fontSize: 12),
                  ),
                ),
                title: Text(c['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                subtitle: Text(c['msg'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textGhost), overflow: TextOverflow.ellipsis),
                trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(c['time'] as String, style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                  if (unread > 0) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(5),
                      decoration: const BoxDecoration(color: _waColor, shape: BoxShape.circle),
                      child: Text('$unread', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ],
                ]),
                onTap: () {},
              ),
            );
          },
        ),

        // ── Campaigns ─────────────────────────────────────────
        Column(children: [
          // Stats
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              _stat('Sent',    '368', _waColor),
              const SizedBox(width: 8),
              _stat('Opened',  '278', AppColors.info),
              const SizedBox(width: 8),
              _stat('Rate',    '75.5%', AppColors.success),
            ]),
          ),
          // Campaign list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _campaigns.length,
              itemBuilder: (_, i) {
                final camp = _campaigns[i];
                final status = camp['status'] as String;
                final c = status == 'ACTIVE' ? _waColor
                    : status == 'SCHEDULED' ? AppColors.info
                    : status == 'COMPLETED' ? AppColors.success
                    : AppColors.textGhost;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: AppColors.cardLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(camp['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                          child: Text(status, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
                        ),
                      ]),
                      const SizedBox(height: 6),
                      Row(children: [
                        Icon(Icons.send_outlined, size: 12, color: AppColors.textGhost),
                        const SizedBox(width: 4),
                        Text('${camp['sent']} sent', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                        const SizedBox(width: 12),
                        Icon(Icons.open_in_new, size: 12, color: AppColors.textGhost),
                        const SizedBox(width: 4),
                        Text('${camp['opened']} opened', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                        const Spacer(),
                        Text(camp['date'] as String, style: const TextStyle(fontSize: 10, color: AppColors.textGhost)),
                      ]),
                    ]),
                  ),
                );
              },
            ),
          ),
        ]),

        // ── Templates ─────────────────────────────────────────
        ListView(padding: const EdgeInsets.all(16), children: [
          ...[
            {'name': 'Order Confirmation', 'category': 'TRANSACTIONAL', 'status': 'APPROVED'},
            {'name': 'Invoice Reminder',   'category': 'UTILITY',       'status': 'APPROVED'},
            {'name': 'Welcome Message',    'category': 'MARKETING',     'status': 'APPROVED'},
            {'name': 'Festival Greetings', 'category': 'MARKETING',     'status': 'PENDING'},
          ].map((t) {
            final statusC = t['status'] == 'APPROVED' ? AppColors.success : AppColors.warning;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.cardLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: ListTile(
                leading: Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: _waColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.message_outlined, size: 18, color: _waColor),
                ),
                title: Text(t['name'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: Text(t['category'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: statusC.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(t['status'] as String, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: statusC)),
                ),
              ),
            );
          }),
        ]),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _cs,
        backgroundColor: _waColor,
        icon: const Icon(Icons.campaign_outlined, color: Colors.white),
        label: const Text('New Campaign', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _stat(String label, String value, Color c) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(color: c.withOpacity(0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: c.withOpacity(0.2))),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: c)),
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
    ]),
  ));
}
