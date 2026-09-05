import { describe, expect, test } from "bun:test";
import { emptyCv } from "@/components/cv/types";
import { EMPTY_LETTER } from "@/components/letter/types";
import { resolveDossierContact } from "@/lib/dossier-contact";

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
});
