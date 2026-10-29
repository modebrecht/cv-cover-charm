import { describe, expect, test } from "bun:test";
import { emptyCv } from "@/components/cv/types";
import { EMPTY_LETTER } from "@/components/letter/types";
import { readDossierContact, resolveDossierContact } from "@/lib/dossier-contact";

const cover = {
  meta: { title: "", author: "", subject: "", keywords: "" },
  kicker: "",
  eyebrow: "",
  beruf: "",
  lehrbeginn: "",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Dorfstrasse 12",
  plzOrt: "",
  telefon: "",
  email: "lea.cover@example.ch",
  geburtsdatum: "",
  lehrbetrieb: "",
  ansprechperson: "",
  betriebAdresse: "",
  ort: "",
  datum: "",
  labelKontakt: "",
  labelEmpfaenger: "",
  foto: null,
};

describe("shared dossier contact", () => {
  test("resolves one field-wise contact with cover -> CV -> letter priority", () => {
    const cv = {
      ...emptyCv,
      person: {
        ...emptyCv.person,
        vorname: "CV",
        nachname: "Person",
        adresse: "CV-Weg 5",
        plzOrt: "4500 Solothurn",
        telefon: "+41 79 111 22 33",
        email: "cv@example.ch",
      },
    };
    const letter = {
      ...EMPTY_LETTER,
      absenderName: "Brief Person",
      absenderAdresse: "Briefweg 9",
      absenderPlzOrt: "3000 Bern",
      absenderTelefon: "+41 31 000 00 00",
      absenderEmail: "brief@example.ch",
    };

    expect(resolveDossierContact({ cover, cv, letter })).toEqual({
      name: "Lea Müller",
      address: "Dorfstrasse 12",
      place: "4500 Solothurn",
      phone: "+41 79 111 22 33",
      email: "lea.cover@example.ch",
    });
  });

  test("falls back to the motivation letter when no cover or CV contact exists", () => {
    const letter = {
      ...EMPTY_LETTER,
      absenderName: "Brief Person",
      absenderAdresse: "Briefweg 9",
      absenderPlzOrt: "3000 Bern",
      absenderTelefon: "+41 31 000 00 00",
      absenderEmail: "brief@example.ch",
    };
    expect(resolveDossierContact({ letter })).toEqual({
      name: "Brief Person",
      address: "Briefweg 9",
      place: "3000 Bern",
      phone: "+41 31 000 00 00",
      email: "brief@example.ch",
    });
  });

  test("returns a stable empty contact when the dossier has no personal source", () => {
    expect(resolveDossierContact({})).toEqual({
      name: "",
      address: "",
      place: "",
      phone: "",
      email: "",
    });
  });
});

test("an unreadable stored cover cannot crash the live CV contact or rewrite saved content", () => {
  const raw = JSON.stringify({ template: "citrus", data: {}, customs: [null] });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  let writes = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => (key === "titelblatt:v3" ? raw : null),
        setItem: () => {
          writes += 1;
        },
      },
    },
  });
  try {
    const cv = {
      ...structuredClone(emptyCv),
      person: { ...emptyCv.person, vorname: "CV", nachname: "Person", email: "cv@example.ch" },
    };
    const contact = readDossierContact({ cv, letter: null });
    expect(contact.name).toBe("CV Person");
    expect(contact.email).toBe("cv@example.ch");
    expect(writes).toBe(0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
