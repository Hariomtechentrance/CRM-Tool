import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../shared/widgets/empty_state.dart';
import '../../data/services/api_client.dart';

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});
  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  bool _loading = true;
  List<dynamic> _docs = [];
  String _search = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/documents');
      final raw = res.data['data'];
      if (!mounted) return;
      setState(() => _docs = raw is List ? raw : (raw?['documents'] as List? ?? []));
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  List<dynamic> get _filtered => _search.isEmpty
      ? _docs
      : _docs.where((d) => (d['name'] as String? ?? '').toLowerCase().contains(_search.toLowerCase())).toList();

  void _cs() => ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Coming soon'), behavior: SnackBarBehavior.floating));

  IconData _fileIcon(String? ext) {
    switch (ext?.toLowerCase()) {
      case 'pdf':  return Icons.picture_as_pdf_outlined;
      case 'xlsx':
      case 'xls':  return Icons.table_chart_outlined;
      case 'docx':
      case 'doc':  return Icons.description_outlined;
      case 'jpg':
      case 'png':  return Icons.image_outlined;
      default:     return Icons.insert_drive_file_outlined;
    }
  }

  Color _fileColor(String? ext) {
    switch (ext?.toLowerCase()) {
      case 'pdf':  return AppColors.danger;
      case 'xlsx':
      case 'xls':  return AppColors.success;
      case 'docx':
      case 'doc':  return AppColors.info;
      case 'jpg':
      case 'png':  return AppColors.warning;
      default:     return AppColors.textSec;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(icon: const Icon(Icons.grid_view_outlined), onPressed: _cs),
          IconButton(icon: const Icon(Icons.upload_outlined),    onPressed: _cs),
        ],
      ),
      body: Column(children: [
        // Search
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Search files...',
              prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.textGhost),
              suffixIcon: _search.isNotEmpty ? IconButton(
                icon: const Icon(Icons.clear, size: 16), onPressed: () => setState(() => _search = ''),
              ) : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),

        // Categories
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: ['All Files', 'Invoices', 'Contracts', 'Reports', 'Images'].map((cat) {
              return Padding(
                padding: const EdgeInsets.only(right: 6),
                child: FilterChip(
                  label: Text(cat, style: const TextStyle(fontSize: 11)),
                  selected: false,
                  onSelected: (_) => setState(() {}),
                  backgroundColor: AppColors.cardLight,
                  side: const BorderSide(color: AppColors.border),
                  showCheckmark: false,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              );
            }).toList(),
          ),
        ),

        // File list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.info))
              : _filtered.isEmpty && _docs.isNotEmpty
                  ? const Center(child: Text('No files match your search', style: TextStyle(color: AppColors.textGhost)))
                  : _docs.isEmpty
                      ? EmptyState(
                          icon: Icons.folder_open_outlined,
                          message: 'No documents yet',
                          subtitle: 'Upload files, contracts, and reports',
                          actionLabel: 'Upload File',
                          onAction: () {},
                        )
                      : RefreshIndicator(
                          color: AppColors.info,
                          onRefresh: _load,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) {
                              final d = _filtered[i] as Map<String, dynamic>;
                              final ext = (d['name'] as String? ?? '').split('.').lastOrNull;
                              final c = _fileColor(ext);
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                decoration: BoxDecoration(
                                  color: AppColors.cardLight,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: ListTile(
                                  leading: Container(
                                    width: 40, height: 40,
                                    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                                    child: Icon(_fileIcon(ext), size: 20, color: c),
                                  ),
                                  title: Text(d['name'] as String? ?? 'Document', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                                  subtitle: Text('${d['size'] as String? ?? 'Unknown size'} • ${d['updatedAt'] as String? ?? ''}', style: const TextStyle(fontSize: 11, color: AppColors.textGhost)),
                                  trailing: IconButton(icon: const Icon(Icons.more_vert, size: 18, color: AppColors.textGhost), onPressed: _cs),
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _cs,
        backgroundColor: AppColors.info,
        icon: const Icon(Icons.upload_file, color: Colors.white),
        label: const Text('Upload', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
