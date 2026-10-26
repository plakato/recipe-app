"use client";

// A submit button that asks first ("Zmazať tento recept?") — for deleting, so
// a misclick doesn't delete anything. Uses the browser's own dialog.
export default function ConfirmButton({
  confirm,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirm: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    />
  );
}
