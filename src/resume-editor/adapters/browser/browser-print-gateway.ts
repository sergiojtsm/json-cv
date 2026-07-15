import type { PrintGateway } from "../../application/ports/print-gateway";

export class BrowserPrintGateway implements PrintGateway {
  constructor(private readonly target: Pick<Window, "print">) {}

  print(): void {
    this.target.print();
  }
}
