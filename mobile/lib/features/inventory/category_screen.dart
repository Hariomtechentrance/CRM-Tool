import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../data/services/api_client.dart';
import '../../shared/widgets/empty_state.dart';

class CategoryScreen extends ConsumerStatefulWidget {
  const CategoryScreen({super.key});
  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  bool _loading = true;
  List<dynamic> _categories = [];

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().getCategories();
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _categories = raw is List ? raw : (raw?['categories'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _addCategory() async {
    final ctrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('New Category'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            hintText: 'Category name',
            prefixIcon: Icon(Icons.label_outline, size: 18, color: AppColors.textGhost),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, foregroundColor: Colors.white),
            child: const Text('Add'),
          ),
        ],
      ),
    );
    final name = ctrl.text.trim();
    ctrl.dispose();
    if (confirmed != true || name.isEmpty) return;
    try {
      await ApiClient().createCategory(name);
      _load();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to create category'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
  }

  Future<void> _editCategory(Map<String, dynamic> cat) async {
    final ctrl = TextEditingController(text: cat['name'] as String? ?? '');
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Rename Category'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            hintText: 'Category name',
            prefixIcon: Icon(Icons.label_outline, size: 18, color: AppColors.textGhost),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    final name = ctrl.text.trim();
    ctrl.dispose();
    if (confirmed != true || name.isEmpty) return;
    try {
      await ApiClient().updateCategory(cat['id'] as String, {'name': name});
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Category renamed'),
        backgroundColor: AppColors.success, behavior: SnackBarBehavior.floating,
      ));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Failed to rename category'),
        backgroundColor: AppColors.danger, behavior: SnackBarBehavior.floating,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Product Categories'),
        actions: [
          IconButton(icon: const Icon(Icons.add), tooltip: 'Add Category', onPressed: _addCategory),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.success))
          : _categories.isEmpty
              ? EmptyState(
                  icon: Icons.label_outlined,
                  message: 'No categories yet',
                  subtitle: 'Organize products by creating categories',
                  actionLabel: 'Add Category',
                  onAction: _addCategory,
                )
              : RefreshIndicator(
                  color: AppColors.success,
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                    itemCount: _categories.length,
                    itemBuilder: (_, i) {
                      final cat       = _categories[i] as Map<String, dynamic>;
                      final count     = cat['productCount'] as int? ?? cat['_count']?['products'] as int? ?? 0;
                      final colors    = [AppColors.success, AppColors.primary, AppColors.info, AppColors.warning, AppColors.secondary, AppColors.danger];
                      final c         = colors[i % colors.length];
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
                            decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                            child: Icon(Icons.label_outlined, size: 20, color: c),
                          ),
                          title: Text(cat['name'] as String? ?? 'Category',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          subtitle: Text('$count product${count == 1 ? '' : 's'}',
                            style: const TextStyle(fontSize: 12, color: AppColors.textGhost)),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                              child: Text('$count', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c)),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.textGhost),
                              onPressed: () => _editCategory(cat),
                            ),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addCategory,
        backgroundColor: AppColors.success,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Category', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
