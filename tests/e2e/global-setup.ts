import { resetE2EDemoData } from "./seed";

export default async function globalSetup() {
  await resetE2EDemoData();
}
