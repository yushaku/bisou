import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar, type Person } from "./CoupleAvatars";

/*
 * One person's photo, or their initials, at full size. The house close button,
 * Escape or a tap outside returns to the avatar that opened it.
 */
export function AvatarViewer({ person, onClose }: { person: Person | null; onClose: () => void }) {
  return (
    <Dialog
      open={!!person}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent aria-describedby={undefined} className="gap-4 sm:max-w-md">
        <DialogTitle className="pr-10 font-heading text-2xl wrap-break-word">{person?.name}</DialogTitle>
        {person && (
          <div className="mx-auto aspect-square w-full">
            <PersonAvatar person={person} size="full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
