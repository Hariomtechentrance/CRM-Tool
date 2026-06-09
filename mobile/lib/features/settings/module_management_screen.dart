import 'package:flutter/material.dart';
import '../../core/theme.dart';

class _Module {
  final String name, description;
  final IconData icon;
  final Color color;
  bool enabled;
  _Module({required this.name, required this.description, required this.icon, required this.color, this.enabled = true});
}

class ModuleManagementScreen extends StatefulWidget {
  const ModuleManagementScreen({super.key});
  @override
  State<ModuleManagementScreen> createState() => _ModuleManagementScreenState();
}

class _ModuleManagementScreenState extends State<ModuleManagementScreen> {
  final List<_Module> _modules = [
    _Module(name: 'CRM',           description: 'Parties, contacts & communications',   icon: Icons.people_outline,           color: AppColors.primary,   enabled: true),
    _Module(name: 'Inventory',     description: 'Products, stock & categories',          icon: Icons.inventory_2_outlined,     color: AppColors.success,   enabled: true),
    _Module(name: 'Finance',       description: 'Invoices, payments & reports',          icon: Icons.receipt_long_outlined,    color: AppColors.danger,    enabled: true),
    _Module(name: 'Leads',         description: 'Pipeline, activities & kanban',         icon: Icons.trending_up_outlined,     color: AppColors.primary,   enabled: true),
    _Module(name: 'HR & Payroll',  description: 'Employees, attendance & leaves',        icon: Icons.badge_outlined,           color: AppColors.info,      enabled: true),
    _Module(name: 'Purchase',      description: 'Purchase orders & vendors',             icon: Icons.shopping_cart_outlined,   color: AppColors.secondary, enabled: true),
    _Module(name: 'Sales',         description: 'Sales orders & dispatch',               icon: Icons.local_shipping_outlined,  color: AppColors.warning,   enabled: true),
    _Module(name: 'Projects',      description: 'Tasks, milestones & kanban',            icon: Icons.task_alt_outlined,        color: AppColors.secondary, enabled: true),
    _Module(name: 'Support',       description: 'Tickets, SLA & resolution',             icon: Icons.headset_mic_outlined,     color: AppColors.danger,    enabled: true),
    _Module(name: 'Warehouse',     description: 'Multi-location stock management',       icon: Icons.warehouse_outlined,       color: AppColors.warning,   enabled: false),
    _Module(name: 'GST Reports',   description: 'GSTR-1, GSTR-3B filing',                icon: Icons.description_outlined,     color: AppColors.success,   enabled: true),
    _Module(name: 'Reports',       description: 'Analytics & data exports',              icon: Icons.bar_chart_outlined,       color: AppColors.info,      enabled: true),
    _Module(name: 'Appointments',  description: 'Calendar & scheduling',                  icon: Icons.calendar_today_outlined,  color: AppColors.primary,   enabled: false),
    _Module(name: 'WhatsApp',      description: 'Messages & campaigns',                  icon: Icons.chat_bubble_outline,      color: const Color(0xFF25D366), enabled: false),
    _Module(name: 'E-commerce',    description: 'Shopify & Flipkart sync',               icon: Icons.storefront_outlined,      color: AppColors.secondary, enabled: false),
    _Module(name: 'Restaurant POS',description: 'KOT, tables & billing',                icon: Icons.restaurant_outlined,      color: const Color(0xFFF97316), enabled: false),
    _Module(name: 'Hotel / Resort',description: 'Room bookings & housekeeping',          icon: Icons.hotel_outlined,           color: const Color(0xFF0EA5E9), enabled: false),
    _Module(name: 'Documents',     description: 'Files, contracts & storage',            icon: Icons.folder_open_outlined,     color: AppColors.info,      enabled: false),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Modules & Features'),
        actions: [
          TextButton(
            onPressed: _saveChanges,
            child: const Text('Save', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.info.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.info.withOpacity(0.2)),
            ),
            child: Row(children: [
              const Icon(Icons.info_outline, size: 16, color: AppColors.info),
              const SizedBox(width: 8),
              const Expanded(child: Text(
                'Enable or disable modules for your organization. Changes take effect immediately.',
                style: TextStyle(fontSize: 12, color: AppColors.info),
              )),
            ]),
          ),
          ..._modules.map((m) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: m.enabled ? m.color.withOpacity(0.2) : AppColors.border),
            ),
            child: SwitchListTile(
              value: m.enabled,
              onChanged: (v) => setState(() => m.enabled = v),
              activeColor: m.color,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              secondary: Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: m.enabled ? m.color.withOpacity(0.1) : AppColors.bgLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(m.icon, size: 18, color: m.enabled ? m.color : AppColors.textGhost),
              ),
              title: Text(m.name, style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: m.enabled ? AppColors.textPrimary : AppColors.textGhost,
              )),
              subtitle: Text(m.description, style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
            ),
          )),
        ],
      ),
    );
  }

  void _saveChanges() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Module settings saved'),
      backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
    ));
    Navigator.of(context).pop();
  }
}
