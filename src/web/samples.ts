// The 5 synthetic sample letters, bundled into app.js as text by esbuild (--loader:.txt=text).
import a from "../../samples/a-resident-tax.txt";
import b from "../../samples/b-health-insurance.txt";
import c from "../../samples/c-pension-student.txt";
import d from "../../samples/d-mynumber-renewal.txt";
import e from "../../samples/e-tax-reminder.txt";
import type { DocType } from "../types";

export type Sample = { id: string; docType: DocType; text: string };

export const SAMPLES: Sample[] = [
  { id: "a-resident-tax", docType: "resident_tax", text: a },
  { id: "b-health-insurance", docType: "health_insurance", text: b },
  { id: "c-pension-student", docType: "pension_student", text: c },
  { id: "d-mynumber-renewal", docType: "mynumber_renewal", text: d },
  { id: "e-tax-reminder", docType: "reminder", text: e },
];
