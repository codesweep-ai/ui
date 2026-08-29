import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders title and body content with role=dialog + aria-modal", () => {
    render(
      <Modal title="My modal" onClose={() => {}}>
        Body content
      </Modal>,
    );
    const dlg = screen.getByRole("dialog");
    expect(dlg).toHaveAttribute("data-modal-dialog", "");
    expect(document.querySelector("[data-modal-content]")).toHaveTextContent("Body content");
    expect(screen.getByText("My modal")).toHaveAttribute("data-modal-title", "");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveAttribute("data-modal-close", "");
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(document.getElementById(dlg.getAttribute("aria-labelledby")!)).toHaveTextContent("My modal");
    expect(screen.getByText("My modal")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("close button fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="x" onClose={onClose}>
        body
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="x" onClose={onClose}>
        body
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="x" onClose={onClose}>
        body
      </Modal>,
    );
    // The backdrop is the outer Modal wrapper itself
    const backdrop = document.querySelector('[data-component="Modal"]')!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("click inside the dialog does NOT fire onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="x" onClose={onClose}>
        <span>inner</span>
      </Modal>,
    );
    await userEvent.click(screen.getByText("inner"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders actions slot when provided", () => {
    render(
      <Modal
        title="x"
        onClose={() => {}}
        actions={
          <>
            <button>Cancel</button>
            <button>Save</button>
          </>
        }
      >
        body
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("merges className onto the modal root", () => {
    render(
      <Modal title="x" onClose={() => {}} className="consumer-modal">
        body
      </Modal>,
    );
    expect(screen.getByRole("dialog").parentElement).toHaveClass("consumer-modal");
  });

  it("body overflow is restored on unmount", () => {
    const { unmount } = render(
      <Modal title="x" onClose={() => {}}>
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("uses unique generated title ids for concurrent dialogs", () => {
    render(<><Modal title="One" onClose={() => {}}>a</Modal><Modal title="Two" onClose={() => {}}>b</Modal></>);
    const ids = screen.getAllByRole("dialog").map((dialog) => dialog.getAttribute("aria-labelledby"));
    expect(new Set(ids).size).toBe(2);
  });

  it("inerts the background and honors initialFocus", () => {
    const target = { current: null } as React.MutableRefObject<HTMLButtonElement | null>;
    const { unmount } = render(<main data-testid="background"><Modal title="x" onClose={() => {}} initialFocus={target}><button ref={target}>Target</button></Modal></main>);
    expect(document.querySelector('[data-testid="background"]')).toHaveAttribute("inert");
    expect(document.activeElement).toHaveTextContent("Target");
    unmount();
  });
});
