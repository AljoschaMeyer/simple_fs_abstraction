import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilesystemExt, MemoryFs, MemoryFsLiteral, parsePath, Path } from "../mod.ts";

Deno.test("Path.isComponent", async (t) => {
  await t.step("rejects empty string", () => {
    assert(!Path.isComponent(""));
  });

  await t.step("rejects single dot", () => {
    assert(!Path.isComponent("."));
  });

  await t.step("rejects double dot", () => {
    assert(!Path.isComponent(".."));
  });

  await t.step("rejects anything with a slash", () => {
    assert(!Path.isComponent("/"));
    assert(!Path.isComponent("asdf/asdf"));
    assert(!Path.isComponent("\\/"));
  });

  await t.step("accepts triple dot", () => {
    assert(Path.isComponent("..."));
  });

  await t.step("accepts normal stuff", () => {
    assert(Path.isComponent("foo"));
    assert(Path.isComponent("foo.txt"));
  });
});

Deno.test("Path constructors", async (t) => {
  await t.step("relative rejects invalid components", () => {
    assertThrows(() => {
      Path.relative(["foo", ".", "bar"]);
    });
  });

  await t.step("absolute rejects invalid components", () => {
    assertThrows(() => {
      Path.absolute(["foo", ".", "bar"]);
    });
  });
});

Deno.test("parsePath", () => {
  assertThrows(() => {
    parsePath("");
  });
  assertThrows(() => {
    parsePath("/foo//bar");
  });
  assertThrows(() => {
    parsePath("/foo/../..");
  });

  assert(parsePath("foo").equals(Path.relative(["foo"])));
  assert(parsePath(".").equals(Path.relative([])));
  assert(parsePath("./foo").equals(Path.relative(["foo"])));
  assert(parsePath("foo/bar").equals(Path.relative(["foo", "bar"])));
  assert(parsePath("foo/bar/../baz").equals(Path.relative(["foo", "baz"])));
  assert(parsePath("foo/././bar/.").equals(Path.relative(["foo", "bar"])));
  assert(parsePath("foo/bar/../baz/qux/../..").equals(Path.relative(["foo"])));
  assert(parsePath("foo/..").equals(Path.relative([])));
  assert(parsePath("../foo").equals(Path.relative(["foo"], 1)));
  assert(parsePath("foo/../bar/../../..").equals(Path.relative([], 2)));

  assert(parsePath("/").equals(Path.absolute([])));
  assert(parsePath("/foo").equals(Path.absolute(["foo"])));
  assert(parsePath("/foo/..").equals(Path.absolute([])));
  assert(parsePath("/foo/bar").equals(Path.absolute(["foo", "bar"])));
  assert(parsePath("/foo/bar/../baz").equals(Path.absolute(["foo", "baz"])));
  assert(parsePath("/././foo/./bar/./.").equals(Path.absolute(["foo", "bar"])));
});

Deno.test("Path.toString", () => {
  assertEquals(Path.absolute([]).toString(), "/");
  assertEquals(Path.absolute(["foo"]).toString(), "/foo");
  assertEquals(Path.absolute(["foo", "bar"]).toString(), "/foo/bar");

  assertEquals(Path.relative([]).toString(), ".");
  assertEquals(Path.relative([], 1).toString(), "..");
  assertEquals(Path.relative([], 3).toString(), "../../..");
  assertEquals(Path.relative(["foo"]).toString(), "foo");
  assertEquals(Path.relative(["foo", "bar"]).toString(), "foo/bar");
  assertEquals(Path.relative(["foo", "bar"], 1).toString(), "../foo/bar");
  assertEquals(Path.relative(["foo", "bar"], 2).toString(), "../../foo/bar");
});

Deno.test("Path.concat", () => {
  assertThrows(() => {
    Path.absolute([]).concat("/");
  });
  assertThrows(() => {
    Path.absolute([]).concat("/foo");
  });
  assertThrows(() => {
    Path.relative([]).concat("/");
  });
  assertThrows(() => {
    Path.relative([]).concat("/foo");
  });

  assertEquals(Path.absolute([]).concat("."), Path.absolute([]));
  assertEquals(Path.absolute(["foo"]).concat("."), Path.absolute(["foo"]));
  assertEquals(Path.absolute([]).concat("foo"), Path.absolute(["foo"]));
  assertEquals(
    Path.absolute(["foo"]).concat("bar"),
    Path.absolute(["foo", "bar"]),
  );
  assertEquals(Path.absolute(["foo"]).concat(".."), Path.absolute([]));
  assertEquals(
    Path.absolute(["foo", "bar"]).concat("../baz"),
    Path.absolute(["foo", "baz"]),
  );
  assertThrows(() => {
    Path.absolute([]).concat("..");
  });
  assertThrows(() => {
    Path.absolute(["foo"]).concat("../..");
  });

  assertEquals(Path.relative([]).concat("."), Path.relative([]));
  assertEquals(Path.relative(["foo"]).concat("."), Path.relative(["foo"]));
  assertEquals(Path.relative([]).concat("foo"), Path.relative(["foo"]));
  assertEquals(
    Path.relative(["foo"]).concat("bar"),
    Path.relative(["foo", "bar"]),
  );
  assertEquals(Path.relative(["foo"]).concat(".."), Path.relative([]));
  assertEquals(
    Path.relative(["foo", "bar"]).concat("../baz"),
    Path.relative(["foo", "baz"]),
  );
  assertEquals(Path.relative([]).concat(".."), Path.relative([], 1));
  assertEquals(Path.relative(["foo"]).concat("../.."), Path.relative([], 1));
});

const testFsLiteral: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: "Mix ingredients, then eat.",
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
};

Deno.test("MemoryFs.cd", () => {
  const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));

  assertEquals(fs.pwd().toString(), "/");

  fs.cd("blog/recipes");
  assertEquals(fs.pwd().toString(), "/blog/recipes");

  fs.cd("..");
  assertEquals(fs.pwd().toString(), "/blog");

  fs.cd("/chess");
  assertEquals(fs.pwd().toString(), "/chess");

  assertThrows(() => {
    fs.cd("../../../..");
  });

  // Assert that the throwing cd didn't change the pwd.
  assertEquals(fs.pwd().toString(), "/chess");

  assertThrows(() => {
    fs.cd("doesntexist");
  });

  assertThrows(() => {
    fs.cd("game1/move1");
  });
});
