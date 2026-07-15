import type { PrintGateway } from "../../application/ports/print-gateway";

export class BrowserPrintGateway implements PrintGateway {
  constructor(
    private readonly target: Pick<Window, "print">,
    private readonly opener: Pick<Window, "open"> = window,
  ) {}

  print(html?: string): void {
    if (!html) {
      this.target.print();
      return;
    }
    const win = this.opener.open("", "_blank");
    if (!win) return;
    (win.document as { write(text: string): void }).write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
}
