import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _partyTypes   = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
const _currencies   = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'];
const _paymentTerms = [0, 7, 15, 30, 45, 60, 90];

class EditPartyScreen extends StatefulWidget {
  final Map<String, dynamic>? party; // null = create mode
  const EditPartyScreen({super.key, this.party});

  @override
  State<EditPartyScreen> createState() => _EditPartyScreenState();
}

class _EditPartyScreenState extends State<EditPartyScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _formKey = GlobalKey<FormState>();
  bool _loading  = false;

  // Basic
  final _nameCtrl    = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _mobileCtrl  = TextEditingController();
  String _type       = 'CUSTOMER';

  // Address
  final _addressCtrl = TextEditingController();
  final _cityCtrl    = TextEditingController();
  final _stateCtrl   = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _pincodeCtrl = TextEditingController();

  // Business
  final _gstCtrl     = TextEditingController();
  final _panCtrl     = TextEditingController();
  final _iecCtrl     = TextEditingController();
  final _creditCtrl  = TextEditingController();
  String _currency   = 'INR';
  int _paymentDays   = 0;

  // Banking
  final _bankNameCtrl   = TextEditingController();
  final _bankAccCtrl    = TextEditingController();
  final _bankIfscCtrl   = TextEditingController();
  final _bankBranchCtrl = TextEditingController();
  final _notesCtrl      = TextEditingController();

  bool get _isEdit => widget.party != null;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    if (_isEdit) _populate();
  }

  void _populate() {
    final p = widget.party!;
    _nameCtrl.text    = p['name']    ?? '';
    _emailCtrl.text   = p['email']   ?? '';
    _phoneCtrl.text   = p['phone']   ?? '';
    _mobileCtrl.text  = p['mobile']  ?? '';
    _type             = p['type']    ?? 'CUSTOMER';
    _addressCtrl.text = p['address'] ?? '';
    _cityCtrl.text    = p['city']    ?? '';
    _stateCtrl.text   = p['state']   ?? '';
    _countryCtrl.text = p['country'] ?? 'IN';
    _pincodeCtrl.text = p['pincode'] ?? '';
    _gstCtrl.text     = p['gstin']   ?? '';
    _panCtrl.text     = p['pan']     ?? '';
    _iecCtrl.text     = p['iecCode'] ?? '';
    _creditCtrl.text  = (p['creditLimit'] ?? '').toString();
    _currency         = p['currency']     ?? 'INR';
    _paymentDays      = p['paymentTermsDays'] ?? 0;
    _bankNameCtrl.text    = p['bankName']   ?? '';
    _bankAccCtrl.text     = p['bankAccount']?? '';
    _bankIfscCtrl.text    = p['bankIfsc']   ?? '';
    _bankBranchCtrl.text  = p['bankBranch'] ?? '';
    _notesCtrl.text       = p['notes']      ?? '';
  }

  @override
  void dispose() {
    _tabs.dispose();
    for (final c in [_nameCtrl, _emailCtrl, _phoneCtrl, _mobileCtrl, _addressCtrl,
      _cityCtrl, _stateCtrl, _countryCtrl, _pincodeCtrl, _gstCtrl, _panCtrl,
      _iecCtrl, _creditCtrl, _bankNameCtrl, _bankAccCtrl, _bankIfscCtrl,
      _bankBranchCtrl, _notesCtrl]) { c.dispose(); }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      _tabs.animateTo(0);
      return;
    }
    setState(() => _loading = true);
    final data = {
      'name':   _nameCtrl.text.trim(),
      'type':   _type,
      if (_emailCtrl.text.trim().isNotEmpty)    'email':   _emailCtrl.text.trim(),
      if (_phoneCtrl.text.trim().isNotEmpty)    'phone':   _phoneCtrl.text.trim(),
      if (_mobileCtrl.text.trim().isNotEmpty)   'mobile':  _mobileCtrl.text.trim(),
      if (_addressCtrl.text.trim().isNotEmpty)  'address': _addressCtrl.text.trim(),
      if (_cityCtrl.text.trim().isNotEmpty)     'city':    _cityCtrl.text.trim(),
      if (_stateCtrl.text.trim().isNotEmpty)    'state':   _stateCtrl.text.trim(),
      if (_countryCtrl.text.trim().isNotEmpty)  'country': _countryCtrl.text.trim(),
      if (_pincodeCtrl.text.trim().isNotEmpty)  'pincode': _pincodeCtrl.text.trim(),
      if (_gstCtrl.text.trim().isNotEmpty)      'gstin':   _gstCtrl.text.trim().toUpperCase(),
      if (_panCtrl.text.trim().isNotEmpty)      'pan':     _panCtrl.text.trim().toUpperCase(),
      if (_iecCtrl.text.trim().isNotEmpty)      'iecCode': _iecCtrl.text.trim().toUpperCase(),
      if (_creditCtrl.text.trim().isNotEmpty)   'creditLimit': double.tryParse(_creditCtrl.text) ?? 0,
      'currency':        _currency,
      'paymentTermsDays': _paymentDays,
      if (_bankNameCtrl.text.trim().isNotEmpty)   'bankName':    _bankNameCtrl.text.trim(),
      if (_bankAccCtrl.text.trim().isNotEmpty)    'bankAccount': _bankAccCtrl.text.trim(),
      if (_bankIfscCtrl.text.trim().isNotEmpty)   'bankIfsc':    _bankIfscCtrl.text.trim().toUpperCase(),
      if (_bankBranchCtrl.text.trim().isNotEmpty) 'bankBranch':  _bankBranchCtrl.text.trim(),
      if (_notesCtrl.text.trim().isNotEmpty)      'notes':       _notesCtrl.text.trim(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateParty(widget.party!['id'], data);
      } else {
        await ApiClient().createParty(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Party updated' : 'Party created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error: ${_parseError(e)}'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _parseError(Object e) {
    final s = e.toString();
    if (s.contains('already exists')) return 'A party with this email/GSTIN already exists.';
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Party' : 'Add Party'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
              : Text(_isEdit ? 'Update' : 'Save',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textGhost,
          indicatorColor: AppColors.primary,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'BASIC'), Tab(text: 'ADDRESS'), Tab(text: 'BUSINESS'), Tab(text: 'BANKING')],
        ),
      ),
      body: Form(
        key: _formKey,
        child: TabBarView(
          controller: _tabs,
          children: [_basicTab(), _addressTab(), _businessTab(), _bankingTab()],
        ),
      ),
    );
  }

  Widget _basicTab() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(children: [
      // Party type selector
      Container(
        decoration: BoxDecoration(color: AppColors.cardLight, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Row(
          children: _partyTypes.map((t) {
            final sel = _type == t;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _type = t),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: sel ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Center(
                    child: Text(t, style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: sel ? Colors.white : AppColors.textGhost,
                    )),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
      const SizedBox(height: 16),
      _field(_nameCtrl, 'Name *', Icons.person_outline,
        validator: (v) => (v == null || v.trim().isEmpty) ? 'Name is required' : null),
      const SizedBox(height: 14),
      _field(_emailCtrl, 'Email', Icons.mail_outline, keyboardType: TextInputType.emailAddress,
        validator: (v) => (v != null && v.isNotEmpty && !v.contains('@')) ? 'Invalid email' : null),
      const SizedBox(height: 14),
      _field(_phoneCtrl, 'Phone', Icons.phone_outlined, keyboardType: TextInputType.phone),
      const SizedBox(height: 14),
      _field(_mobileCtrl, 'Mobile', Icons.smartphone_outlined, keyboardType: TextInputType.phone),
    ]),
  );

  Widget _addressTab() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(children: [
      _field(_addressCtrl, 'Address', Icons.location_on_outlined, maxLines: 3),
      const SizedBox(height: 14),
      _field(_cityCtrl, 'City', Icons.location_city_outlined),
      const SizedBox(height: 14),
      _field(_stateCtrl, 'State', Icons.map_outlined),
      const SizedBox(height: 14),
      _field(_countryCtrl, 'Country', Icons.public_outlined),
      const SizedBox(height: 14),
      _field(_pincodeCtrl, 'Pincode', Icons.pin_drop_outlined, keyboardType: TextInputType.number,
        validator: (v) => (v != null && v.isNotEmpty && v.length != 6) ? 'Enter 6-digit pincode' : null),
    ]),
  );

  Widget _businessTab() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(children: [
      _field(_gstCtrl, 'GSTIN', Icons.receipt_long_outlined, textCapitalization: TextCapitalization.characters,
        validator: (v) {
          if (v != null && v.isNotEmpty && !RegExp(r'^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$').hasMatch(v.toUpperCase())) {
            return 'Invalid GSTIN format';
          }
          return null;
        }),
      const SizedBox(height: 14),
      _field(_panCtrl, 'PAN', Icons.credit_card_outlined, textCapitalization: TextCapitalization.characters),
      const SizedBox(height: 14),
      _field(_iecCtrl, 'IEC Code', Icons.import_export_outlined, textCapitalization: TextCapitalization.characters),
      const SizedBox(height: 14),
      _field(_creditCtrl, 'Credit Limit (₹)', Icons.account_balance_wallet_outlined, keyboardType: TextInputType.number),
      const SizedBox(height: 14),
      DropdownButtonFormField<String>(
        value: _currency,
        decoration: const InputDecoration(labelText: 'Currency', prefixIcon: Icon(Icons.currency_rupee, size: 18, color: AppColors.textGhost)),
        items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)))).toList(),
        onChanged: (v) => setState(() => _currency = v!),
      ),
      const SizedBox(height: 14),
      DropdownButtonFormField<int>(
        value: _paymentDays,
        decoration: const InputDecoration(labelText: 'Payment Terms (days)', prefixIcon: Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.textGhost)),
        items: _paymentTerms.map((d) => DropdownMenuItem(value: d, child: Text(d == 0 ? 'Immediate' : 'Net $d days', style: const TextStyle(fontSize: 13)))).toList(),
        onChanged: (v) => setState(() => _paymentDays = v!),
      ),
    ]),
  );

  Widget _bankingTab() => SingleChildScrollView(
    padding: const EdgeInsets.all(20),
    child: Column(children: [
      _field(_bankNameCtrl, 'Bank Name', Icons.account_balance_outlined),
      const SizedBox(height: 14),
      _field(_bankAccCtrl, 'Account Number', Icons.numbers_outlined, keyboardType: TextInputType.number),
      const SizedBox(height: 14),
      _field(_bankIfscCtrl, 'IFSC Code', Icons.code_outlined, textCapitalization: TextCapitalization.characters),
      const SizedBox(height: 14),
      _field(_bankBranchCtrl, 'Branch', Icons.business_outlined),
      const SizedBox(height: 14),
      _field(_notesCtrl, 'Notes', Icons.notes_outlined, maxLines: 4),
      const SizedBox(height: 24),
      FCButton(label: _isEdit ? 'Update Party' : 'Create Party', loading: _loading, onPressed: _submit),
    ]),
  );

  Widget _field(
    TextEditingController ctrl,
    String label,
    IconData icon, {
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) => TextFormField(
    controller: ctrl,
    keyboardType: keyboardType,
    textCapitalization: textCapitalization,
    maxLines: maxLines,
    textInputAction: maxLines == 1 ? TextInputAction.next : TextInputAction.newline,
    decoration: InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 18, color: AppColors.textGhost),
      alignLabelWithHint: maxLines > 1,
    ),
    validator: validator,
  );
}
