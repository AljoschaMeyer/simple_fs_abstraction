/**
 * Either a proper path, or a string that can be parsed into a proper Path (see `parsePath`).
 *
 * When using a string that cannot be parsed into a Path, things may error or misbehave in arbitrary other ways.
 */
export type Pathish = Path | string;

/**
 * An immutable, normalised path in the fs.
 */
export class Path {
  // - 1 for absolute paths, a natural number for a relative path wihch starts with this many `..` components.
  private readonly relativity: number;
  private readonly components: string[];

  constructor(relativity: number, components: string[]) {
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
   * Return whether a given string would be a valid path component (suitable for use with the `relative` or `absolute` functions for Path creation).
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
      throw "Cannot concatenate an absolute path to another path";
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
      throw "The `..` components of an absolute path must not step above the root, but they would after this concatenation";
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
 * Parses a string into a `Path`. Uses `/` as a path separator.
 * Absolute paths start with `/`, relative paths start with zero or more `..` components, or with a single `.` component. Inernal `..` components are resolved as expected (they effectively annihilate the preceding "real" component; going "above" the root in an absolute path yields an error), and internal `.` components are ignored (as expected). Path components may not contain `/`, and may not be the empty string.
 */
export function parsePath(str: string): Path {
  if (str.length === 0) {
    throw "The empty string is not a valid rendered path";
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
        throw "The empty string is not a valid path component";
      }
    } else if (part === ".") {
      // do nothing
    } else if (part === "..") {
      if (components.length === 0) {
        if (isAbsolute) {
          throw "The `..` components of an absolute path must not step above the root";
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
