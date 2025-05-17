/**
 * Either a proper path, or a string that can be parsed into a proper Path (see `parsePath`).
 *
 * When using a string that cannot be parsed into a Path, things may error or misbehave in arbitrary other ways.
 */
export type Pathish = Path | string;

/**
 * An immutable, normalised path in a simple filesystem.
 */
export class Path {
  // - 1 for absolute paths, a natural number for a relative path wihch starts with this many `..` components.
  private readonly relativity: number;
  private readonly components: string[];

  private constructor(relativity: number, components: string[]) {
    for (const component of components) {
      if (!Path.isComponent(component)) {
        throw `Invalid component: ${component}`;
      }
    }

    this.relativity = relativity;
    this.components = components;
  }

  /**
   * Create a relative path. The `parentSteps` must be a natural number and indicate how many `..`s there are (conceptually) at the start of the path.
   */
  public static relative(components: string[], parentSteps = 0): Path {
    if (Number.isInteger(parentSteps) && parentSteps >= 0) {
      return new Path(parentSteps, components);
    } else {
      throw "Invalid relativity for a relative path";
    }
  }

  public static absolute(components: string[]): Path {
    return new Path(-1, components);
  }

  public static fromPathish(pathish: Pathish): Path {
    if (typeof pathish === "string") {
      return parsePath(pathish);
    } else {
      return pathish;
    }
  }

  /**
   * Constructs a new path by removing the first component of this path. Returns undefined if the path had no components to start with.
   */
  public popFront(): Path | undefined {
    if (this.components.length > 0) {
      const componentCopy = [...this.components];
      componentCopy.shift();

      if (this.isAbsolute()) {
        return Path.absolute(componentCopy);
      } else {
        return Path.relative(componentCopy, this.relativity);
      }
    } else {
      return undefined;
    }
  }

  /**
   * Returns whether a given string would be a valid path component (suitable for use with the `relative` or `absolute` functions for Path creation).
   *
   * A valid componenent must not contain any `/`, and must not be equal to any of `".."`, `"."`, or `""`.
   */
  public static isComponent(s: string): boolean {
    return !s.includes("/") && s !== "" && s !== "." && s !== "..";
  }

  /**
   * Returns with how many `..` steps this path starts. For absolute paths, this always returns zero.
   */
  public getParentSteps(): number {
    if (this.isAbsolute()) {
      return 0;
    } else {
      return this.relativity;
    }
  }

  /**
   * Returns a copy of the components of this path. Does not include any `..` steps at the start of this path.
   */
  public getComponents(): string[] {
    return [...this.components];
  }

  /**
   * Returns a component by index.
   */
  public getIthComponent(i: number): string | undefined {
    if (this.components.length > i) {
      return this.components[i];
    } else {
      return undefined;
    }
  }

  /**
   * Returns the number of components (not counting leading `..` steps) of this path.
   */
  public getComponentCount(): number {
    return this.components.length;
  }

  public isAbsolute(): boolean {
    return this.relativity === -1;
  }

  public equals(other: Pathish): boolean {
    const other_ = Path.fromPathish(other);

    if (
      this.relativity !== other_.relativity ||
      this.components.length !== other_.components.length
    ) {
      return false;
    }

    for (let i = 0; i < this.components.length; i++) {
      if (this.components[i] !== other_.components[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns whether `this` is a prefix of `other`.
   */
  public prefixes(other: Pathish): boolean {
    const other_ = Path.fromPathish(other);

    if (
      this.relativity !== other_.relativity ||
      this.components.length > other_.components.length
    ) {
      return false;
    }

    for (let i = 0; i < this.components.length; i++) {
      if (this.components[i] !== other_.components[i]) {
        return false;
      }
    }

    return true;
  }

  public isPrefixedBy(other: Pathish): boolean {
    const other_ = Path.fromPathish(other);

    return other_.prefixes(this);
  }

  public concat(other: Pathish): Path {
    const other_ = Path.fromPathish(other);

    if (other_.isAbsolute()) {
      throw new ConcatPathError(
        "You cannot append an absolute path to another path.",
        this,
        other_,
      );
    }

    let relativity = this.relativity;
    const components = [...this.components];

    for (let _i = 0; _i < other_.relativity; _i++) {
      if (components.length > 0) {
        components.pop();
      } else {
        relativity += 1;
      }
    }

    if (this.isAbsolute() && relativity > -1) {
      throw new ConcatPathError(
        "The `..` components of an absolute path must not step above the root, but they would after this concatenation.",
        this,
        other_,
      );
    }

    for (const component of other_.components) {
      components.push(component);
    }

    if (this.isAbsolute()) {
      return Path.absolute(components);
    } else {
      return Path.relative(components, relativity);
    }
  }

  public toString(): string {
    if (this.isAbsolute()) {
      if (this.components.length === 0) {
        return "/";
      } else {
        let rendered = "";

        for (const component of this.components) {
          rendered = `${rendered}/${component}`;
        }

        return rendered;
      }
    } else {
      if (this.components.length === 0 && this.relativity === 0) {
        return ".";
      } else {
        let rendered = this.relativity === 0 ? "" : "..";
        for (let i = 1; i < this.relativity; i++) {
          rendered = `${rendered}/..`;
        }

        if (this.components.length === 0) {
          return rendered;
        } else {
          if (this.relativity > 0) {
            rendered = `${rendered}/`;
          }

          rendered = `${rendered}${this.components[0]}`;

          for (let i = 1; i < this.components.length; i++) {
            rendered = `${rendered}/${this.components[i]}`;
          }

          return rendered;
        }
      }
    }
  }
}

/**
 * The type of errors thrown by `Path.concat`. The `name` property is always `ConcatPathError`.
 */
export class ConcatPathError extends Error {
  base: Path;
  appending: Path;

  constructor(message: string, base: Path, appending: Path) {
    super(message);
    Object.setPrototypeOf(this, MemoryFsError.prototype);
    this.name = "ConcatPathError";
    this.base = base;
    this.appending = appending;
  }
}

/**
 * Parses a string into a `Path`. Uses `/` as a path separator.
 * Absolute paths start with `/`, relative paths start with zero or more `..` components, or with a single `.` component. Internal `..` components are resolved as expected (they effectively annihilate the preceding "real" component; going "above" the root in an absolute path yields an error), and internal `.` components are ignored (as expected). Path components may not contain `/`, and may not be the empty string.
 *
 * Throws `ParseSimpleFsPathError`s when receiving an argument that cannot be parsed.
 */
export function parsePath(str: string): Path {
  if (str.length === 0) {
    throw new ParseSimpleFsPathError(
      "The empty string cannot be parsed into a Path. Perhaps you need `.` or `/`?",
      str,
    );
  }

  if (str === "/") {
    return Path.absolute([]);
  }

  const isAbsolute = str.startsWith("/");
  let parentSteps = 0;

  const components: string[] = [];

  let isFirstEmptyComponent = true;

  for (const part of str.split("/")) {
    if (part === "") {
      if (isFirstEmptyComponent && isAbsolute) {
        isFirstEmptyComponent = false;
      } else {
        throw new ParseSimpleFsPathError(
          "The empty string cannot be used as a path component, but you tried to parse a string into a Path that contained successive slashes.",
          str,
        );
      }
    } else if (part === ".") {
      // do nothing
    } else if (part === "..") {
      if (components.length === 0) {
        if (isAbsolute) {
          throw new ParseSimpleFsPathError(
            "When parsing a string into a Path, the `..` components of an absolute path must not step above the root.",
            str,
          );
        } else {
          parentSteps += 1;
        }
      } else {
        components.pop();
      }
    } else {
      components.push(part);
    }
  }

  if (isAbsolute) {
    return Path.absolute(components);
  } else {
    return Path.relative(components, parentSteps);
  }
}

/**
 * The type of errors thrown by `parsePath`. The `name` property is always `ParseSimpleFsPathError`.
 */
export class ParseSimpleFsPathError extends Error {
  stringToParse: string;

  constructor(message: string, stringToParse: string) {
    super(message);
    Object.setPrototypeOf(this, MemoryFsError.prototype);
    this.name = "ParseSimpleFsPathError";
    this.stringToParse = stringToParse;
  }
}

/**
 * Describes how some file operations should operated when they would conflict with existing files.
 * Implementations must have all operations default to `"timid"`.
 *
 * - `"timid"`: throw an error.
 * - `"placid"`: leave the file system unchanged.
 * - `"assertive"`: overwrite whatever was there before.
 */
export type Mode = "timid" | "placid" | "assertive";

/**
 * A simple filesystem. A filesystem is a combination of a root *directory* and a *working directory*. A *directory* is a mapping from path components to directories or data files.
 *
 * All operations that take paths as arguments apply the path to the current working directory to determine where to operate. If applying the path results in an invalid path or the path cannot be followed in the file system because of data files instead of directories, the operation performs no changes and rejects (async) or throws (sync). If a path cannot be followed because directories do not exist, then the behaviour depends on the operation: operations that create files (all operations which reutnr `void` or `Promise<void>`) will simply create the necessary directories. All other operations will reject/throw.
 *
 * Async operations do not throw but reject instead.
 */
export interface SimpleFilesystem {
  /**
   * Returns the current working directory.
   */
  pwd(): Path;

  /**
   * Sets the working directory by applying a path to the current working directory.
   */
  cd(path: Pathish): void;

  /**
   * Returns the names of all files in the directory at the given path. Rejects if the path addresses a data file instead of a directory.
   */
  ls(path: Pathish): Promise<Set<string>>;
  /**
   * Synchronously returns the names of all files in the directory at the given path. Throws if the path addresses a data file instead of a directory.
   */
  lsSync(path: Pathish): Set<string>;

  /**
   * Returns what kind of file (if any) is at the given path. Rejects if the parent of the targeted file does not exist.
   */
  stat(path: Pathish): Promise<"directory" | "data" | "nothing">;
  /**
   * Synchronously returns what kind of file (if any) is at the given path. Throws if the parent of the targeted file does not exist.
   */
  statSync(path: Pathish): "directory" | "data" | "nothing";

  /**
   * Reads the complete contents of a data file into a byte buffer. Rejects if the path addresses a directory (or nothing).
   */
  read(path: Pathish): Promise<Uint8Array>;
  /**
   * Synchronously reads the complete contents of a data file into a byte buffer. Throws if the path addresses a directory (or nothing).
   */
  readSync(path: Pathish): Uint8Array;

  /**
   * Creates a file with the given contents at the given path.
   */
  write(
    path: Pathish,
    data: Uint8Array,
    mode?: Mode,
  ): Promise<void>;
  /**
   * Synchronously creates a file with the given contents at the given path.
   */
  writeSync(path: Pathish, data: Uint8Array, mode?: Mode): void;

  /**
   * Creates an empty directory at the given path.
   */
  mkdir(path: Pathish, mode?: Mode): Promise<void>;
  /**
   * Synchronously creates an empty directory at the given path.
   */
  mkdirSync(path: Pathish, mode?: Mode): void;

  /**
   * Removes the file at the given path. Rejects if there is no file there.
   */
  remove(path: Pathish): Promise<void>;
  /**
   * Removes the file at the given path. Throws if there is no file there.
   */
  removeSync(path: Pathish): void;

  /**
   * Copies the file (which may be a directory) at `src` to `dst`. Rejects if `src` is not a file. The `mode` applies to `dst`.
   */
  copy(src: Pathish, dst: Pathish, mode?: Mode): Promise<void>;
  /**
   * Synchronously copies the file (which may be a directory) at `src` to `dst`. Throws if `src` is not a file. The `mode` applies to `dst`.
   */
  copySync(src: Pathish, dst: Pathish, mode?: Mode): void;

  /**
   * Moves the file (which may be a directory) at `src` to `dst`. Rejects if `src` is not a file. The `mode` applies to `dst`.
   */
  move(src: Pathish, dst: Pathish, mode?: Mode): Promise<void>;
  /**
   * Synchronously moves the file (which may be a directory) at `src` to `dst`. Throws if `src` is not a file. The `mode` applies to `dst`.
   */
  moveSync(src: Pathish, dst: Pathish, mode?: Mode): void;
}

/**
 * A `SimpleFilesystem` together with more utility functions. Any `SimpleFilesystem` can be converted into a `SimpleFilesystemExt` via the `FilesystemExt` class, but this interface can also be implemented natively for more efficient method implementations than the default implementation of `FilesystemExt`.
 */
export interface SimpleFilesystemExt {
  /**
   * Reads the complete contents of a utf8 data file into a string. Rejects if the file does not contain valid utf8, or if the path addresses a directory (or nothing).
   */
  readString(path: Pathish): Promise<string>;
  /**
   * Synchronously reads the complete contents of a utf8 data file into a string. Throws if the file does not contain valid utf8, or if the path addresses a directory (or nothing).
   */
  readStringSync(path: Pathish): string;

  /**
   * Creates a file with the utf8 encoding of the given string at the given path.
   */
  writeString(
    path: Pathish,
    data: string,
    mode?: Mode,
  ): Promise<void>;
  /**
   * Synchronously creates a file with the utf8 encoding of the given string at the given path.
   */
  writeStringSync(path: Pathish, data: string, mode?: Mode): void;

  /**
   * Ensures there is no file at the given destination (if the mode allows for overwriting, will remove the destination when necessary, otherwise will reject).
   */
  ensureNot(path: Pathish, mode?: Mode): Promise<void>;
  /**
   * Synchronously there is no file at the given destination (if the mode allows for overwriting, will remove the destination when necessary, otherwise will reject).
   */
  ensureNotSync(path: Pathish, mode?: Mode): void;

  /**
   * Returns `true` iff the `other` file system is equal to this file system. Ignores current working directories, compares both from their roots.
   */
  eq(other: SimpleFilesystem): boolean;
}

/**
 * Turns a `SimpleFilesystem` into a `SimpleFilesystemExt` with some default implementations.
 */
export class FilesystemExt<Fs extends SimpleFilesystem>
  implements SimpleFilesystem, SimpleFilesystemExt {
  fs: Fs;

  constructor(fs: Fs) {
    this.fs = fs;
  }

  pwd(): Path {
    return this.fs.pwd();
  }

  cd(path: Pathish): void {
    return this.fs.cd(path);
  }

  ls(path: Pathish): Promise<Set<string>> {
    return this.fs.ls(path);
  }

  lsSync(path: Pathish): Set<string> {
    return this.fs.lsSync(path);
  }

  stat(path: Pathish): Promise<"directory" | "data" | "nothing"> {
    return this.fs.stat(path);
  }

  statSync(path: Pathish): "directory" | "data" | "nothing" {
    return this.fs.statSync(path);
  }

  read(path: Pathish): Promise<Uint8Array> {
    return this.fs.read(path);
  }

  readSync(path: Pathish): Uint8Array {
    return this.fs.readSync(path);
  }

  write(path: Pathish, data: Uint8Array, mode?: Mode): Promise<void> {
    return this.fs.write(path, data, mode);
  }

  writeSync(path: Pathish, data: Uint8Array, mode?: Mode): void {
    return this.fs.writeSync(path, data, mode);
  }

  mkdir(path: Pathish, mode?: Mode): Promise<void> {
    return this.fs.mkdir(path, mode);
  }

  mkdirSync(path: Pathish, mode?: Mode): void {
    return this.fs.mkdirSync(path, mode);
  }

  remove(path: Pathish): Promise<void> {
    return this.fs.remove(path);
  }

  removeSync(path: Pathish): void {
    return this.fs.removeSync(path);
  }

  copy(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return this.fs.copy(src, dst, mode);
  }

  copySync(src: Pathish, dst: Pathish, mode?: Mode): void {
    return this.fs.copySync(src, dst, mode);
  }

  move(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return this.fs.move(src, dst, mode);
  }

  moveSync(src: Pathish, dst: Pathish, mode?: Mode): void {
    return this.fs.moveSync(src, dst, mode);
  }

  async readString(path: Pathish): Promise<string> {
    const bytes = await this.fs.read(path);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  }

  readStringSync(path: Pathish): string {
    const bytes = this.fs.readSync(path);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  }

  writeString(path: Pathish, data: string, mode?: Mode): Promise<void> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    return this.fs.write(path, bytes, mode);
  }

  writeStringSync(path: Pathish, data: string, mode?: Mode): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    return this.fs.writeSync(path, bytes, mode);
  }

  async ensureNot(path: Pathish, mode?: Mode): Promise<void> {
    let stat = "nothing";
    try {
      stat = await this.fs.stat(path);
    } catch {
      // Yay, nothing is at the path.
      // Nothing else to do.
      return;
    }

    if (stat !== "nothing") {
      if (mode === "assertive") {
        return this.fs.remove(path);
      } else {
        throw new Error(
          "Would have to delete a file for `ensureNotSync`, but the `mode` was " +
            mode,
        );
      }
    }
  }

  ensureNotSync(path: Pathish, mode?: Mode): void {
    let stat = "nothing";
    try {
      stat = this.fs.statSync(path);
    } catch {
      // Yay, nothing is at the path.
      // Nothing else to do.
      return;
    }

    if (stat !== "nothing") {
      if (mode === "assertive") {
        this.fs.removeSync(path);
      } else {
        throw new Error(
          "Would have to delete a file for `ensureNotSync`, but the `mode` was " +
            mode,
        );
      }
    }
  }

  eq(other: SimpleFilesystem): boolean {
    return fileEq(this.fs, Path.absolute([]), other, Path.absolute([]));
  }
}

function fileEq(
  fs1: SimpleFilesystem,
  path1: Path,
  fs2: SimpleFilesystem,
  path2: Path,
): boolean {
  const stat1 = fs1.statSync(path1);
  const stat2 = fs2.statSync(path2);

  if (stat1 !== stat2) {
    return false;
  }

  if (stat1 === "nothing") {
    return true;
  } else if (stat1 === "data") {
    const data1 = fs1.readSync(path1);
    const data2 = fs2.readSync(path2);

    if (data1.length !== data2.length) {
      return false;
    } else {
      for (let i = 0; i < data1.length; i++) {
        if (data1[i] !== data2[i]) {
          return false;
        }
      }

      return true;
    }
  } else {
    // Got two directories.
    const ls1 = fs1.lsSync(path1);
    const ls2 = fs2.lsSync(path2);

    if (ls1.size !== ls2.size) {
      return false;
    } else {
      return [...ls1].every((comp) => {
        return fileEq(
          fs1,
          path1.concat(Path.relative([comp])),
          fs2,
          path2.concat(Path.relative([comp])),
        );
      });
    }
  }
}

const NO_SUCH_FILE = "Addressed a file but there is no file of that name.";
const EXPECTED_DIRECTORY_GOT_DATA =
  "Addressed a directory but there was a data file instead.";

/**
 * An implementation of `SimpleFilesystem` that stores data purely in memory.
 */
export class MemoryFs implements SimpleFilesystem {
  private root: MemoryDirectory;
  private workingDirectory: Path;

  constructor() {
    this.root = new MemoryDirectory(new Map());
    this.workingDirectory = Path.absolute([]);
  }

  private resolveAbsolutePath(
    path: Pathish,
    createParentDirs = false,
  ): MemoryDirectory | Uint8Array | "nothing" {
    return this.root.resolveAbsolutePath(path, createParentDirs);
  }

  pwd(): Path {
    return this.workingDirectory;
  }

  cd(path: Pathish): void {
    const path_ = Path.fromPathish(path);

    const target = path_.isAbsolute()
      ? path_
      : this.workingDirectory.concat(path_);

    const resolved = this.resolveAbsolutePath(target, false);

    if (resolved === "nothing") {
      throw new MemoryFsError(NO_SUCH_FILE);
    } else if (resolved instanceof MemoryDirectory) {
      this.workingDirectory = target;
      return;
    } else {
      throw new MemoryFsError(EXPECTED_DIRECTORY_GOT_DATA);
    }
  }

  ls(path: Pathish): Promise<Set<string>> {
    return Promise.resolve(this.lsSync(path));
  }

  lsSync(path: Pathish): Set<string> {
    throw new Error("Method not implemented.");
  }

  stat(path: Pathish): Promise<"directory" | "data" | "nothing"> {
    return Promise.resolve(this.statSync(path));
  }

  statSync(path: Pathish): "directory" | "data" | "nothing" {
    throw new Error("Method not implemented.");
  }

  read(path: Pathish): Promise<Uint8Array<ArrayBuffer>> {
    return Promise.resolve(this.readSync(path));
  }

  readSync(path: Pathish): Uint8Array<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }

  write(path: Pathish, data: Uint8Array, mode?: Mode): Promise<void> {
    return Promise.resolve(this.writeSync(path, data, mode));
  }

  writeSync(path: Pathish, data: Uint8Array, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }

  mkdir(path: Pathish, mode?: Mode): Promise<void> {
    return Promise.resolve(this.mkdirSync(path, mode));
  }

  mkdirSync(path: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }

  remove(path: Pathish): Promise<void> {
    return Promise.resolve(this.removeSync(path));
  }

  removeSync(path: Pathish): void {
    throw new Error("Method not implemented.");
  }

  copy(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return Promise.resolve(this.copySync(src, dst, mode));
  }

  copySync(src: Pathish, dst: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }

  move(src: Pathish, dst: Pathish, mode?: Mode): Promise<void> {
    return Promise.resolve(this.moveSync(src, dst, mode));
  }

  moveSync(src: Pathish, dst: Pathish, mode?: Mode): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Create a populated `MemoryFs` (with a current working directory of `/`).
   *
   * Throws if any of the strings is not a valid component.
   */
  static fromLiteral(literal: MemoryFsLiteral): MemoryFs {
    const fs = new MemoryFs();
    fs.root = MemoryDirectory.fromLiteral(literal);
    return fs;
  }
}

/**
 * The argument for `MemoryFs.fromLiteral`, use this to create an immediately populated `MemoryFs`, usually for testing.
 */
export type MemoryFsLiteral = { [key: string]: string | MemoryFsLiteral };

class MemoryDirectory {
  contents: Map<string, MemoryDirectory | Uint8Array>;

  constructor(contents?: Map<string, MemoryDirectory | Uint8Array>) {
    if (contents === undefined) {
      this.contents = new Map();
    } else {
      this.contents = contents;
    }
  }

  resolveAbsolutePath(
    path: Pathish,
    createParentDirs = false,
  ): MemoryDirectory | Uint8Array | "nothing" {
    const path_ = Path.fromPathish(path);

    const firstComponent = path_.getIthComponent(0);
    const popped = path_.popFront()!;
    const componentCount = path_.getComponentCount();

    if (firstComponent === undefined) {
      return this;
    } else {
      const file = this.contents.get(firstComponent);

      if (file === undefined) {
        if (createParentDirs) {
          if (componentCount === 1) {
            return "nothing";
          } else {
            const newDir = new MemoryDirectory();
            this.contents.set(firstComponent, newDir);
            return newDir.resolveAbsolutePath(popped, createParentDirs);
          }
        } else {
          if (componentCount === 1) {
            return "nothing";
          } else {
            throw new MemoryFsError(NO_SUCH_FILE);
          }
        }
      } else if (file instanceof MemoryDirectory) {
        if (componentCount === 1) {
          return file;
        } else {
          return file.resolveAbsolutePath(popped, createParentDirs);
        }
      } else {
        if (componentCount === 1) {
          return file;
        } else {
          throw new MemoryFsError(EXPECTED_DIRECTORY_GOT_DATA);
        }
      }
    }
  }

  static fromLiteral(literal: MemoryFsLiteral): MemoryDirectory {
    const dir = new MemoryDirectory();

    for (const comp in literal) {
      if (Path.isComponent(comp)) {
        const val = literal[comp];

        if (typeof val === "string") {
          const encoder = new TextEncoder();
          const bytes = encoder.encode(val);
          dir.contents.set(comp, bytes);
        } else {
          const nestedDir = MemoryDirectory.fromLiteral(val);
          dir.contents.set(comp, nestedDir);
        }
      } else {
        throw `Invalid MemoryFsLiteral: ${comp} is not a valid Path component.`;
      }
    }

    return dir;
  }
}

/**
 * The type of errors thrown by all `MemoryFs` operations (in addition to `ConcatPathError`s and `ParseSimpleFsPathError`s). The `name` property is always `MemoryFsError`.
 */
export class MemoryFsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MemoryFsError.prototype);
    this.name = "MemoryFsError";
  }
}
