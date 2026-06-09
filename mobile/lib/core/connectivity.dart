import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Emits the latest [ConnectivityResult] list whenever the network state changes.
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// Derived bool — true when at least one non-none connection is present.
final isOnlineProvider = Provider<bool>((ref) {
  final conn = ref.watch(connectivityProvider);
  return conn.when(
    data: (results) => results.any((r) => r != ConnectivityResult.none),
    loading: () => true,  // assume online until we know otherwise
    error: (_, __) => true,
  );
});
