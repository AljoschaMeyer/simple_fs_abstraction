# Simple FS Abstraction

This typescript library provides a simple, platform-agnostic abstraction for
filesystems: paths, files and directories, and that is it. No symlinks, no
hardlinks, no metadata, no locking. Intended to be backed by implementations for
different typescript runtimes and/or platforms (or runtime-agnostic in-memory
backends for non-persistent use-cases).
