import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  FilesystemExt,
  MemoryFs,
  type MemoryFsLiteral,
  parsePath,
  Path,
} from "../mod.ts";

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

const curryText = "Mix ingredients, then eat.";

const testFsLiteral: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const pancakeText = "Buy cake, heat in pan.";

const testFsLiteralExtraRecipe: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
      pancakes: pancakeText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const testFsLiteralUpdatedCurry: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: pancakeText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const testFsLiteralButChessTurnedIntoPancakes: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: pancakeText,
  emptyDir: {},
};

const testFsLiteralNewFileInNewDirectory: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newdir: { pancakes: pancakeText },
};

const testFsLiteralExtraRecipeDirectory: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
      pancakes: {},
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const testFsLiteralButChessTurnedIntoDirectory: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {},
  emptyDir: {},
};

const testFsLiteralNewDirectoryInNewDirectory: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newdir: { pancakes: {} },
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

Deno.test("MemoryFs.ls", () => {
  const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));

  const set1 = fs.lsSync();
  assertEquals(set1.size, 3);
  assert(set1.has("blog"));
  assert(set1.has("chess"));
  assert(set1.has("emptyDir"));

  const set2 = fs.lsSync("blog/posts");
  assertEquals(set2.size, 2);
  assert(set2.has("intro"));
  assert(set2.has("deepThoughts.md"));

  assertEquals(fs.lsSync("emptyDir").size, 0);

  assertThrows(() => {
    fs.lsSync("..");
  });

  assertThrows(() => {
    fs.lsSync("blog/recipes/nope");
  });

  assertThrows(() => {
    fs.lsSync("blog/recipes/curry");
  });
});

Deno.test("MemoryFs.stat", () => {
  const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));

  assertEquals(fs.statSync("blog/posts"), "directory");
  assertEquals(fs.statSync("blog/recipes/curry"), "data");
  assertEquals(fs.statSync("blog/recipes/nope"), "nothing");

  assertThrows(() => {
    fs.statSync("..");
  });
});

Deno.test("MemoryFs.read", () => {
  const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));

  const encoder = new TextEncoder();
  const curryBytes = encoder.encode(curryText);
  assertEquals(fs.readSync("blog/recipes/curry"), curryBytes);

  assertThrows(() => {
    fs.readSync("..");
  });

  assertThrows(() => {
    fs.readSync("blog/recipes/nope");
  });

  assertThrows(() => {
    fs.readSync("blog");
  });
});

Deno.test("MemoryFs.write", () => {
  const encoder = new TextEncoder();
  const pancakeBytes = encoder.encode(pancakeText);

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/pancakes", pancakeBytes);
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipe)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "timid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipe)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipe)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/pancakes", pancakeBytes, "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipe)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.writeSync("blog/recipes/curry", pancakeBytes);
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.writeSync("blog/recipes/curry", pancakeBytes, "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/curry", pancakeBytes, "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("blog/recipes/curry", pancakeBytes, "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralUpdatedCurry)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.writeSync("chess", pancakeBytes);
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.writeSync("chess", pancakeBytes, "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("chess", pancakeBytes, "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("chess", pancakeBytes, "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralButChessTurnedIntoPancakes)),
    );
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("newdir/pancakes", pancakeBytes);
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralNewFileInNewDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("newdir/pancakes", pancakeBytes, "timid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralNewFileInNewDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("newdir/pancakes", pancakeBytes, "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralNewFileInNewDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("newdir/pancakes", pancakeBytes, "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralNewFileInNewDirectory)));
  })();

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("..", pancakeBytes, "assertive");
  });
  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.writeSync("/", pancakeBytes, "assertive");
  });
});

Deno.test("MemoryFs.mkdir", () => {
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("blog/recipes/pancakes");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipeDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("blog/recipes/pancakes", "timid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipeDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("blog/recipes/pancakes", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipeDirectory)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("blog/recipes/pancakes", "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteralExtraRecipeDirectory)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.mkdirSync("chess");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.mkdirSync("chess", "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("chess", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("chess", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralButChessTurnedIntoDirectory)),
    );
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("newdir/pancakes");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralNewDirectoryInNewDirectory)),
    );
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("newdir/pancakes", "timid");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralNewDirectoryInNewDirectory)),
    );
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("newdir/pancakes", "placid");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralNewDirectoryInNewDirectory)),
    );
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("newdir/pancakes", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteralNewDirectoryInNewDirectory)),
    );
  })();

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.mkdirSync("..", "assertive");
  });
});

Deno.test("MemoryFs.remove", () => {
  (() => {
    const fs = new FilesystemExt(
      MemoryFs.fromLiteral(testFsLiteralExtraRecipeDirectory),
    );
    fs.removeSync("blog/recipes/pancakes");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();

  (() => {
    const fs = new FilesystemExt(
      MemoryFs.fromLiteral(testFsLiteralNewFileInNewDirectory),
    );
    fs.removeSync("newdir");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteral)),
    );
  })();

  (() => {
    const fs = new FilesystemExt(
      MemoryFs.fromLiteral(testFsLiteralNewDirectoryInNewDirectory),
    );
    fs.removeSync("newdir");
    assert(
      fs.eq(MemoryFs.fromLiteral(testFsLiteral)),
    );
  })();

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.removeSync("..");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.removeSync("/");
  });
});

const copy1: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newDir: { moreCurry: curryText },
};

const copy2: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newDir: {
    recipes: {
      curry: curryText,
    },
  },
};

const copy3: MemoryFsLiteral = {
  blog: {
    posts: curryText,
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const copy4: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {},
  emptyDir: {},
};

const copy5: MemoryFsLiteral = {
  blog: {
    posts: curryText,
    recipes: {
      curry: pancakeText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const copy6: MemoryFsLiteral = {
  blog: {
    posts: pancakeText,
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

Deno.test("MemoryFs.copy", () => {
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "newDir/moreCurry");
    assert(fs.eq(MemoryFs.fromLiteral(copy1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "timid");
    assert(fs.eq(MemoryFs.fromLiteral(copy1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(copy1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "newDir/moreCurry", "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(copy1)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes", "newDir/recipes");
    assert(fs.eq(MemoryFs.fromLiteral(copy2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes", "newDir/recipes", "timid");
    assert(fs.eq(MemoryFs.fromLiteral(copy2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes", "newDir/recipes", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(copy2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes", "newDir/recipes", "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(copy2)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.copySync("blog/recipes/curry", "blog/posts");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.copySync("blog/recipes/curry", "blog/posts", "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "blog/posts", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "blog/posts", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(copy3)),
    );
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.copySync("emptyDir", "chess");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.copySync("emptyDir", "chess", "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("emptyDir", "chess", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(testFsLiteral)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("emptyDir", "chess", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(copy4)),
    );
  })();

  // Performs deep clones, not shallow copies.
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "blog/posts", "assertive");
    fs.writeStringSync("blog/recipes/curry", pancakeText, "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(copy5)),
    );
  })();

  // Performs deep clones, not shallow copies.
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "blog/posts", "assertive");
    fs.writeStringSync("blog/posts", pancakeText, "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(copy6)),
    );
  })();

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("..", "blog", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog", "..", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("doesntExist", "blog", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog/recipes/curry", "/", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.copySync("blog", "/", "assertive");
  });
});

const move1: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {},
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newDir: { moreCurry: curryText },
};

const move2: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
  newDir: {
    recipes: {
      curry: curryText,
    },
  },
};

const move3: MemoryFsLiteral = {
  blog: {
    posts: curryText,
    recipes: {},
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const move4: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {},
};

const move5: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {},
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
  emptyDir: {},
};

const move6: MemoryFsLiteral = {
  blog: {
    posts: {
      intro: "Hiiii!!!!",
      "deepThoughts.md":
        "I'd like to be under the sea in an octopus's garden in the shade.",
    },
    recipes: {
      curry: curryText,
    },
  },
  chess: {
    game1: {
      move1: "e4",
    },
  },
};

Deno.test("MemoryFs.move", () => {
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry");
    assert(fs.eq(MemoryFs.fromLiteral(move1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "timid");
    assert(fs.eq(MemoryFs.fromLiteral(move1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(move1)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "newDir/moreCurry", "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(move1)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes", "newDir/recipes");
    assert(fs.eq(MemoryFs.fromLiteral(move2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes", "newDir/recipes", "timid");
    assert(fs.eq(MemoryFs.fromLiteral(move2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes", "newDir/recipes", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(move2)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes", "newDir/recipes", "assertive");
    assert(fs.eq(MemoryFs.fromLiteral(move2)));
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.moveSync("blog/recipes/curry", "blog/posts");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.moveSync("blog/recipes/curry", "blog/posts", "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "blog/posts", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(move5)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "blog/posts", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(move3)),
    );
  })();

  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.moveSync("emptyDir", "chess");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    assertThrows(() => {
      fs.moveSync("emptyDir", "chess", "timid");
    });
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("emptyDir", "chess", "placid");
    assert(fs.eq(MemoryFs.fromLiteral(move6)));
  })();
  (() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("emptyDir", "chess", "assertive");
    assert(
      fs.eq(MemoryFs.fromLiteral(move4)),
    );
  })();

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("..", "blog", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog", "..", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("doesntExist", "blog", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog/recipes/curry", "/", "assertive");
  });

  assertThrows(() => {
    const fs = new FilesystemExt(MemoryFs.fromLiteral(testFsLiteral));
    fs.moveSync("blog", "/", "assertive");
  });
});
