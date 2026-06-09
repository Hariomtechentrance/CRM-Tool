import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _departments = ['General', 'Sales', 'Purchase', 'Operations', 'Finance', 'HR', 'IT', 'Marketing', 'Logistics', 'Management'];
const _employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];

class AddEmployeeScreen extends StatefulWidget {
  final Map<String, dynamic>? employee;
  const AddEmployeeScreen({super.key, this.employee});

  @override
  State<AddEmployeeScreen> createState() => _AddEmployeeScreenState();
}

class _AddEmployeeScreenState extends State<AddEmployeeScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _designCtrl  = TextEditingController();
  final _salaryCtrl  = TextEditingController();
  final _empCodeCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  String _department    = 'General';
  String _employmentType = 'FULL_TIME';
  String _status        = 'ACTIVE';
  DateTime? _joinDate;
  bool _loading = false;

  bool get _isEdit => widget.employee != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _populate();
  }

  void _populate() {
    final e = widget.employee!;
    _nameCtrl.text    = e['name']           as String? ?? '';
    _emailCtrl.text   = e['email']          as String? ?? '';
    _phoneCtrl.text   = e['phone']          as String? ?? '';
    _designCtrl.text  = e['designation']    as String? ?? '';
    _salaryCtrl.text  = (e['salary']        ?? '').toString();
    _empCodeCtrl.text = e['employeeCode']   as String? ?? '';
    _addressCtrl.text = e['address']        as String? ?? '';
    _department       = e['department']     as String? ?? 'General';
    _employmentType   = e['employmentType'] as String? ?? 'FULL_TIME';
    _status           = e['status']         as String? ?? 'ACTIVE';
    if (e['joiningDate'] != null) _joinDate = DateTime.tryParse(e['joiningDate'] as String);
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _designCtrl.dispose(); _salaryCtrl.dispose(); _empCodeCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _joinDate ?? DateTime.now(),
      firstDate: DateTime(2010),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _joinDate = picked);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'name':        _nameCtrl.text.trim(),
      'status':      _status,
      'department':  _department,
      'employmentType': _employmentType,
      if (_emailCtrl.text.trim().isNotEmpty)   'email':        _emailCtrl.text.trim(),
      if (_phoneCtrl.text.trim().isNotEmpty)   'phone':        _phoneCtrl.text.trim(),
      if (_designCtrl.text.trim().isNotEmpty)  'designation':  _designCtrl.text.trim(),
      if (_salaryCtrl.text.trim().isNotEmpty)  'salary':       double.tryParse(_salaryCtrl.text) ?? 0,
      if (_empCodeCtrl.text.trim().isNotEmpty) 'employeeCode': _empCodeCtrl.text.trim(),
      if (_addressCtrl.text.trim().isNotEmpty) 'address':      _addressCtrl.text.trim(),
      if (_joinDate != null) 'joiningDate': _joinDate!.toIso8601String(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateEmployee(widget.employee!['id'] as String, data);
      } else {
        await ApiClient().createEmployee(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Employee updated' : 'Employee added'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to save employee'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Employee' : 'Add Employee'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.info))
                : Text(_isEdit ? 'Update' : 'Save',
                    style: const TextStyle(color: AppColors.info, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [

            // Status
            const Text('Status', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textGhost)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: ['ACTIVE', 'INACTIVE'].map((s) {
              final sel = _status == s;
              final c   = s == 'ACTIVE' ? AppColors.success : AppColors.danger;
              return GestureDetector(
                onTap: () => setState(() => _status = s),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? c : AppColors.cardLight,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? c : AppColors.border),
                  ),
                  child: Text(s, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: sel ? Colors.white : c)),
                ),
              );
            }).toList()),
            const SizedBox(height: 20),

            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Full Name *',
                prefixIcon: Icon(Icons.person_outlined, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _empCodeCtrl,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Employee Code',
                prefixIcon: Icon(Icons.numbers, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _designCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Designation',
                prefixIcon: Icon(Icons.work_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // Department dropdown
            DropdownButtonFormField<String>(
              value: _department,
              decoration: const InputDecoration(
                labelText: 'Department',
                prefixIcon: Icon(Icons.corporate_fare, size: 18, color: AppColors.textGhost),
              ),
              items: _departments.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
              onChanged: (v) => setState(() => _department = v!),
            ),
            const SizedBox(height: 14),

            // Employment type
            DropdownButtonFormField<String>(
              value: _employmentType,
              decoration: const InputDecoration(
                labelText: 'Employment Type',
                prefixIcon: Icon(Icons.badge_outlined, size: 18, color: AppColors.textGhost),
              ),
              items: _employmentTypes.map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' ')))).toList(),
              onChanged: (v) => setState(() => _employmentType = v!),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _salaryCtrl,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Monthly Salary ₹',
                prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Phone',
                prefixIcon: Icon(Icons.phone_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            // Joining date
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.bgLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.textGhost),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Joining Date', style: TextStyle(fontSize: 10, color: AppColors.textGhost, fontWeight: FontWeight.w500)),
                    Text(_joinDate == null ? 'Select date' : DateFormat('dd MMM yyyy').format(_joinDate!),
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                        color: _joinDate == null ? AppColors.textGhost : AppColors.textPrimary)),
                  ])),
                  const Icon(Icons.chevron_right, size: 18, color: AppColors.textGhost),
                ]),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _addressCtrl,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Address',
                prefixIcon: Icon(Icons.home_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 28),

            FCButton(
              label: _isEdit ? 'Update Employee' : 'Add Employee',
              loading: _loading,
              onPressed: _submit,
              color: AppColors.info,
              icon: _isEdit ? Icons.save_outlined : Icons.person_add_outlined,
            ),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}
