import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';

const _hotelColor = Color(0xFF0EA5E9);

class HotelScreen extends ConsumerStatefulWidget {
  const HotelScreen({super.key});
  @override
  ConsumerState<HotelScreen> createState() => _HotelScreenState();
}

class _HotelScreenState extends ConsumerState<HotelScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 4, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  final _rooms = [
    {'no': '101', 'type': 'Standard', 'floor': 1, 'status': 'AVAILABLE', 'guest': null,  'checkOut': null,   'rate': 2500},
    {'no': '102', 'type': 'Standard', 'floor': 1, 'status': 'OCCUPIED',  'guest': 'Rahul Sharma', 'checkOut': '10 Jun', 'rate': 2500},
    {'no': '103', 'type': 'Deluxe',   'floor': 1, 'status': 'OCCUPIED',  'guest': 'Priya Singh',  'checkOut': '11 Jun', 'rate': 4500},
    {'no': '104', 'type': 'Deluxe',   'floor': 1, 'status': 'CLEANING',  'guest': null,  'checkOut': null,   'rate': 4500},
    {'no': '201', 'type': 'Suite',    'floor': 2, 'status': 'AVAILABLE', 'guest': null,  'checkOut': null,   'rate': 8000},
    {'no': '202', 'type': 'Suite',    'floor': 2, 'status': 'RESERVED',  'guest': 'Amit Kumar', 'checkOut': '12 Jun', 'rate': 8000},
    {'no': '203', 'type': 'Deluxe',   'floor': 2, 'status': 'AVAILABLE', 'guest': null,  'checkOut': null,   'rate': 4500},
    {'no': '204', 'type': 'Standard', 'floor': 2, 'status': 'OCCUPIED',  'guest': 'Sunita Patel', 'checkOut': '9 Jun', 'rate': 2500},
  ];

  final _bookings = [
    {'id': 'BK-001', 'guest': 'Rahul Sharma',  'room': '102', 'checkIn': '8 Jun', 'checkOut': '10 Jun', 'status': 'CHECKED_IN', 'amount': 5000},
    {'id': 'BK-002', 'guest': 'Priya Singh',   'room': '103', 'checkIn': '9 Jun', 'checkOut': '11 Jun', 'status': 'CHECKED_IN', 'amount': 9000},
    {'id': 'BK-003', 'guest': 'Amit Kumar',    'room': '202', 'checkIn': '10 Jun','checkOut': '12 Jun', 'status': 'CONFIRMED',  'amount': 16000},
    {'id': 'BK-004', 'guest': 'Sunita Patel',  'room': '204', 'checkIn': '7 Jun', 'checkOut': '9 Jun',  'status': 'CHECKED_IN', 'amount': 5000},
    {'id': 'BK-005', 'guest': 'Vikram Nair',   'room': '201', 'checkIn': '11 Jun','checkOut': '13 Jun', 'status': 'PENDING',    'amount': 16000},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Hotel / Resort'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: _cs),
          IconButton(icon: const Icon(Icons.add), onPressed: _cs),
        ],
        bottom: TabBar(
          controller: _tabs,
          isScrollable: true,
          labelColor: _hotelColor,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: _hotelColor,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Rooms'), Tab(text: 'Bookings'), Tab(text: 'Housekeeping'), Tab(text: 'Reports')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildRooms(),
        _buildBookings(),
        _buildHousekeeping(),
        _buildReports(),
      ]),
    );
  }

  Widget _buildRooms() {
    final occupied  = _rooms.where((r) => r['status'] == 'OCCUPIED').length;
    final available = _rooms.where((r) => r['status'] == 'AVAILABLE').length;
    final reserved  = _rooms.where((r) => r['status'] == 'RESERVED').length;
    final cleaning  = _rooms.where((r) => r['status'] == 'CLEANING').length;
    return Column(children: [
      // Occupancy
      Padding(
        padding: const EdgeInsets.all(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [_hotelColor, Color(0xFF0284C7)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(children: [
            Expanded(child: _occ('Available', available, Colors.white)),
            _vdiv(),
            Expanded(child: _occ('Occupied',  occupied,  Colors.white)),
            _vdiv(),
            Expanded(child: _occ('Reserved',  reserved,  Colors.white)),
            _vdiv(),
            Expanded(child: _occ('Cleaning',  cleaning,  Colors.white)),
          ]),
        ),
      ),
      // Room grid
      Expanded(
        child: GridView.builder(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 1.2,
          ),
          itemCount: _rooms.length,
          itemBuilder: (_, i) {
            final r = _rooms[i];
            final status = r['status'] as String;
            final c = status == 'AVAILABLE' ? AppColors.success
                : status == 'OCCUPIED'  ? _hotelColor
                : status == 'RESERVED'  ? AppColors.warning
                : AppColors.textGhost;
            return InkWell(
              onTap: () => _showRoomDialog(r),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                decoration: BoxDecoration(
                  color: c.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: c.withOpacity(0.3)),
                ),
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Row(children: [
                    Icon(Icons.hotel, size: 18, color: c),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(color: c.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                      child: Text(status, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: c)),
                    ),
                  ]),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Room ${r['no']}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: c)),
                    Text(r['type'] as String, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                    Text('₹${r['rate']}/night', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textSec)),
                    if (r['guest'] != null)
                      Text(r['guest'] as String, style: const TextStyle(fontSize: 10, color: AppColors.textGhost, fontStyle: FontStyle.italic), overflow: TextOverflow.ellipsis),
                  ]),
                ]),
              ),
            );
          },
        ),
      ),
    ]);
  }

  Widget _buildBookings() => ListView.builder(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
    itemCount: _bookings.length,
    itemBuilder: (_, i) {
      final b = _bookings[i];
      final status = b['status'] as String;
      final c = status == 'CHECKED_IN' ? _hotelColor
          : status == 'CONFIRMED' ? AppColors.success
          : status == 'PENDING'   ? AppColors.warning
          : AppColors.textGhost;
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppColors.cardLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Center(child: Text(
                (b['guest'] as String).split(' ').map((n) => n[0]).take(2).join(),
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: c),
              )),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b['guest'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              Text('Room ${b['room']} • ${b['checkIn']} → ${b['checkOut']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('₹${b['amount']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                child: Text(status.replaceAll('_', ' '), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
              ),
            ]),
          ]),
        ),
      );
    },
  );

  Widget _buildHousekeeping() => ListView(padding: const EdgeInsets.all(16), children: [
    const Text('Housekeeping Tasks', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
    const SizedBox(height: 10),
    ...[
      {'room': '104', 'task': 'Deep Cleaning', 'assigned': 'Maria', 'status': 'IN_PROGRESS', 'priority': 'HIGH'},
      {'room': '202', 'task': 'Turndown', 'assigned': 'John', 'status': 'PENDING', 'priority': 'MEDIUM'},
      {'room': '101', 'task': 'Linen Change', 'assigned': 'Maria', 'status': 'COMPLETED', 'priority': 'LOW'},
      {'room': '203', 'task': 'Cleaning',      'assigned': 'Ravi',  'status': 'PENDING', 'priority': 'MEDIUM'},
    ].map((task) {
      final c = task['status'] == 'COMPLETED' ? AppColors.success
          : task['status'] == 'IN_PROGRESS' ? AppColors.warning
          : AppColors.info;
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
            decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(Icons.cleaning_services_outlined, size: 16, color: c),
          ),
          title: Text('Room ${task['room']} – ${task['task']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          subtitle: Text('Assigned: ${task['assigned']}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(5)),
            child: Text((task['status'] as String).replaceAll('_', ' '), style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: c)),
          ),
        ),
      );
    }),
  ]);

  Widget _buildReports() => ListView(padding: const EdgeInsets.all(16), children: [
    _reportCard('Occupancy Rate', '75%', Icons.percent, _hotelColor),
    const SizedBox(height: 10),
    _reportCard('Revenue Today', '₹38,500', Icons.trending_up, AppColors.success),
    const SizedBox(height: 10),
    _reportCard('Avg. Stay Duration', '2.4 nights', Icons.nights_stay_outlined, AppColors.warning),
    const SizedBox(height: 10),
    _reportCard('Check-outs Today', '3', Icons.logout_outlined, AppColors.info),
    const SizedBox(height: 10),
    _reportCard('Check-ins Today', '5', Icons.login_outlined, AppColors.primary),
  ]);

  Widget _reportCard(String l, String v, IconData icon, Color c) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: Row(children: [
      Container(width: 40, height: 40, decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: c)),
      const SizedBox(width: 12),
      Expanded(child: Text(l, style: const TextStyle(fontSize: 13, color: AppColors.textSec))),
      Text(v, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: c)),
    ]),
  );

  Widget _occ(String label, int count, Color c) => Column(children: [
    Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: c)),
    Text(label, style: TextStyle(fontSize: 9, color: c.withOpacity(0.8), fontWeight: FontWeight.w500)),
  ]);

  Widget _vdiv() => Container(width: 1, height: 32, color: Colors.white.withOpacity(0.3));

  void _showRoomDialog(Map<String, dynamic> room) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('Room ${room['no']} – ${room['type']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          if (room['status'] == 'AVAILABLE') ...[
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.book_online),
              label: const Text('Check In / Book'),
              style: ElevatedButton.styleFrom(backgroundColor: _hotelColor, foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 44)),
            ),
          ] else if (room['status'] == 'OCCUPIED') ...[
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.logout),
              label: const Text('Check Out'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 44)),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.receipt_long),
              label: const Text('View Bill'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 44)),
            ),
          ],
        ]),
      ),
    );
  }
}
