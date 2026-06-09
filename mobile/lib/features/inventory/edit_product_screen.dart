import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../shared/widgets/fc_button.dart';
import '../../data/services/api_client.dart';

const _units = ['PCS', 'KG', 'MT', 'LTR', 'BOX', 'BAG', 'ROLL', 'BUNDLE', 'PAIR', 'SET', 'DOZEN', 'TON', 'METER', 'SQ_MT'];
const _taxRates = [0.0, 5.0, 12.0, 18.0, 28.0];

class EditProductScreen extends StatefulWidget {
  final Map<String, dynamic>? product;
  const EditProductScreen({super.key, this.product});

  @override
  State<EditProductScreen> createState() => _EditProductScreenState();
}

class _EditProductScreenState extends State<EditProductScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _skuCtrl      = TextEditingController();
  final _nameCtrl     = TextEditingController();
  final _descCtrl     = TextEditingController();
  final _costCtrl     = TextEditingController();
  final _sellCtrl     = TextEditingController();
  final _mrpCtrl      = TextEditingController();
  final _hsnCtrl      = TextEditingController();
  final _barcodeCtrl  = TextEditingController();
  final _reorderCtrl  = TextEditingController();
  final _categoryCtrl = TextEditingController();
  String _unit        = 'PCS';
  double _taxRate     = 18.0;
  bool _loading       = false;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _populate();
  }

  void _populate() {
    final p = widget.product!;
    _skuCtrl.text      = p['sku']          ?? '';
    _nameCtrl.text     = p['name']         ?? '';
    _descCtrl.text     = p['description']  ?? '';
    _costCtrl.text     = (p['costPrice']   ?? '').toString();
    _sellCtrl.text     = (p['sellingPrice']?? '').toString();
    _mrpCtrl.text      = (p['mrp']         ?? '').toString();
    _hsnCtrl.text      = p['hsnCode']      ?? '';
    _barcodeCtrl.text  = p['barcode']      ?? '';
    _reorderCtrl.text  = (p['reorderLevel']?? 0).toString();
    _categoryCtrl.text = p['category']     ?? '';
    _unit              = p['unit']         ?? 'PCS';
    _taxRate           = (p['taxRate']     ?? 18.0).toDouble();
  }

  @override
  void dispose() {
    for (final c in [_skuCtrl, _nameCtrl, _descCtrl, _costCtrl, _sellCtrl,
      _mrpCtrl, _hsnCtrl, _barcodeCtrl, _reorderCtrl, _categoryCtrl]) { c.dispose(); }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final data = {
      'sku':          _skuCtrl.text.trim().toUpperCase(),
      'name':         _nameCtrl.text.trim(),
      'unit':         _unit,
      'costPrice':    double.tryParse(_costCtrl.text) ?? 0,
      'sellingPrice': double.tryParse(_sellCtrl.text) ?? 0,
      'taxRate':      _taxRate,
      if (_descCtrl.text.trim().isNotEmpty)     'description':  _descCtrl.text.trim(),
      if (_mrpCtrl.text.trim().isNotEmpty)      'mrp':          double.tryParse(_mrpCtrl.text) ?? 0,
      if (_hsnCtrl.text.trim().isNotEmpty)      'hsnCode':      _hsnCtrl.text.trim(),
      if (_barcodeCtrl.text.trim().isNotEmpty)  'barcode':      _barcodeCtrl.text.trim(),
      if (_reorderCtrl.text.trim().isNotEmpty)  'reorderLevel': int.tryParse(_reorderCtrl.text) ?? 0,
      if (_categoryCtrl.text.trim().isNotEmpty) 'category':     _categoryCtrl.text.trim(),
    };
    try {
      if (_isEdit) {
        await ApiClient().updateProduct(widget.product!['id'], data);
      } else {
        await ApiClient().createProduct(data);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_isEdit ? 'Product updated' : 'Product created'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().contains('sku') ? 'A product with this SKU already exists.' : 'Failed to save product.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
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
        title: Text(_isEdit ? 'Edit Product' : 'Add Product'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _submit,
            child: _loading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
              : Text(_isEdit ? 'Update' : 'Save',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _section('Product Info'),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(
                flex: 2,
                child: TextFormField(
                  controller: _skuCtrl,
                  textCapitalization: TextCapitalization.characters,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'SKU *',
                    prefixIcon: Icon(Icons.qr_code_outlined, size: 18, color: AppColors.textGhost),
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'SKU required' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 1,
                child: DropdownButtonFormField<String>(
                  value: _unit,
                  decoration: const InputDecoration(labelText: 'Unit'),
                  items: _units.map((u) => DropdownMenuItem(value: u, child: Text(u, style: const TextStyle(fontSize: 12)))).toList(),
                  onChanged: (v) => setState(() => _unit = v!),
                ),
              ),
            ]),
            const SizedBox(height: 14),

            TextFormField(
              controller: _nameCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Product Name *',
                prefixIcon: Icon(Icons.inventory_2_outlined, size: 18, color: AppColors.textGhost),
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Name required' : null,
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _categoryCtrl,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Category',
                prefixIcon: Icon(Icons.category_outlined, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.textGhost),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 20),

            _section('Pricing'),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(child: TextFormField(
                controller: _costCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Cost Price ₹ *',
                  prefixIcon: Icon(Icons.price_change_outlined, size: 18, color: AppColors.textGhost)),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              )),
              const SizedBox(width: 12),
              Expanded(child: TextFormField(
                controller: _sellCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Selling Price ₹ *',
                  prefixIcon: Icon(Icons.sell_outlined, size: 18, color: AppColors.textGhost)),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              )),
            ]),
            const SizedBox(height: 14),

            Row(children: [
              Expanded(child: TextFormField(
                controller: _mrpCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'MRP ₹',
                  prefixIcon: Icon(Icons.local_offer_outlined, size: 18, color: AppColors.textGhost)),
              )),
              const SizedBox(width: 12),
              Expanded(child: DropdownButtonFormField<double>(
                value: _taxRate,
                decoration: const InputDecoration(labelText: 'GST %'),
                items: _taxRates.map((r) => DropdownMenuItem(
                  value: r, child: Text('${r.toInt()}%', style: const TextStyle(fontSize: 13)),
                )).toList(),
                onChanged: (v) => setState(() => _taxRate = v!),
              )),
            ]),
            const SizedBox(height: 20),

            _section('Inventory Control'),
            const SizedBox(height: 12),

            Row(children: [
              Expanded(child: TextFormField(
                controller: _hsnCtrl,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'HSN Code',
                  prefixIcon: Icon(Icons.code_outlined, size: 18, color: AppColors.textGhost)),
              )),
              const SizedBox(width: 12),
              Expanded(child: TextFormField(
                controller: _reorderCtrl,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Reorder Level',
                  prefixIcon: Icon(Icons.warning_amber_outlined, size: 18, color: AppColors.textGhost)),
              )),
            ]),
            const SizedBox(height: 14),

            TextFormField(
              controller: _barcodeCtrl,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Barcode / EAN',
                prefixIcon: Icon(Icons.barcode_reader, size: 18, color: AppColors.textGhost),
              ),
            ),
            const SizedBox(height: 28),

            FCButton(label: _isEdit ? 'Update Product' : 'Add Product', loading: _loading, onPressed: _submit),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }

  Widget _section(String label) => Text(label,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary));
}
