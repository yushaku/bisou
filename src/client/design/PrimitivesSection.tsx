import { CalendarDays, Heart, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/format";
import { useDesignT } from "./messages";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-xl">{title}</h3>
      {children}
    </div>
  );
}

function State({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {children}
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// Forced focus look, so the ring shows in a static screenshot.
const FOCUS = "ring-3 ring-ring ring-offset-2 ring-offset-background";
const FIELD_FOCUS = "border-ring ring-3 ring-ring/40";

export function PrimitivesSection() {
  const d = useDesignT();
  const { t, locale } = useI18n();
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 10, 2));
  const [remind, setRemind] = useState(true);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <Block title="Button">
        <div className="flex flex-wrap gap-4">
          <State label={d("stateDefault")}><Button>{t("spin.spin")}</Button></State>
          <State label={d("stateHover")}><Button className="bg-primary/85">{t("spin.spin")}</Button></State>
          <State label={d("stateFocus")}><Button className={FOCUS}>{t("spin.spin")}</Button></State>
          <State label={d("stateDisabled")}><Button disabled>{t("spin.spin")}</Button></State>
          <State label={d("stateLoading")}><Button loading>{t("spin.spinning")}</Button></State>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary">{t("journal.new")}</Button>
          <Button variant="outline">{t("wishes.add")}</Button>
          <Button variant="ghost">{t("home.seeAll")}</Button>
          <Button variant="destructive"><Trash2 aria-hidden="true" />{d("delete")}</Button>
          <Button variant="link">{t("login.resend")}</Button>
          <Button size="icon" aria-label={t("journal.new")}><Pencil /></Button>
          <Button size="icon" variant="outline" aria-label={d("share")}><Share2 /></Button>
        </div>
      </Block>

      <Block title="Input, Label">
        <div className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="d-in-1">{t("login.email")}</Label><Input id="d-in-1" placeholder={t("login.emailPlaceholder")} /><span className="text-sm text-muted-foreground">{d("stateDefault")}</span></div>
          <div className="grid gap-2"><Label htmlFor="d-in-2">{t("home.displayName")}</Label><Input id="d-in-2" defaultValue="Minh Anh" className={FIELD_FOCUS} /><span className="text-sm text-muted-foreground">{d("stateFocus")}</span></div>
          <div className="grid gap-2"><Label htmlFor="d-in-3">{t("login.email")}</Label><Input id="d-in-3" defaultValue="minhanh@" aria-invalid aria-describedby="d-in-3-err" /><span id="d-in-3-err" className="text-base text-destructive">{d("errorSample")}</span></div>
          <div className="grid gap-2"><Label htmlFor="d-in-4">{t("spin.budget")}</Label><Input id="d-in-4" defaultValue="500.000" disabled /><span className="text-sm text-muted-foreground">{d("stateDisabled")}</span></div>
        </div>
      </Block>

      <Block title="Textarea">
        <Label htmlFor="d-ta">{d("sampleNote")}</Label>
        <Textarea id="d-ta" placeholder={d("sampleNotePlaceholder")} defaultValue="Hôm nay hai đứa đi chợ hoa Quảng An, mua một bó cúc hoạ mi về cắm ở bàn ăn." />
      </Block>

      <Block title="Select, Switch">
        <div className="grid gap-2">
          <Label htmlFor="d-select">{t("settings.darkTheme")}</Label>
          <Select defaultValue="frappe">
            <SelectTrigger id="d-select" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="frappe">Frappé</SelectItem>
              <SelectItem value="macchiato">Macchiato</SelectItem>
              <SelectItem value="mocha">Mocha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="d-switch">{d("notifications")}</Label>
          <Switch id="d-switch" checked={remind} onCheckedChange={setRemind} />
        </div>
        <div className="flex items-center justify-between gap-3 opacity-100">
          <Label htmlFor="d-switch-2">{d("stateDisabled")}</Label>
          <Switch id="d-switch-2" disabled />
        </div>
      </Block>

      <Block title="Tabs, ToggleGroup">
        <Tabs defaultValue="mine">
          <TabsList className="w-full">
            <TabsTrigger value="mine">{t("wishes.mine")}</TabsTrigger>
            <TabsTrigger value="spin">{t("spin.title")}</TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="pt-2 text-base text-muted-foreground">{t("empty.wishes")}</TabsContent>
          <TabsContent value="spin" className="pt-2 text-base text-muted-foreground">{t("spin.hint", { name: "Quốc Bảo" })}</TabsContent>
        </Tabs>
        <ToggleGroup type="single" variant="outline" spacing={1} defaultValue="2" aria-label={t("wish.priority2")}>
          <ToggleGroupItem value="1">{t("wish.priority1")}</ToggleGroupItem>
          <ToggleGroupItem value="2">{t("wish.priority2")}</ToggleGroupItem>
          <ToggleGroupItem value="3">{t("wish.priority3")}</ToggleGroupItem>
        </ToggleGroup>
      </Block>

      <Block title="Badge, Avatar, Skeleton, Separator">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{t("milestone.label")}</Badge>
          <Badge variant="secondary">{t("wish.priority3")}</Badge>
          <Badge variant="outline">2 ảnh</Badge>
          <Badge variant="destructive">{d("stateError")}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="size-11"><AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback></Avatar>
          <Avatar className="size-11"><AvatarFallback className="bg-secondary text-secondary-foreground">B</AvatarFallback></Avatar>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex flex-1 flex-col gap-2" aria-busy="true" aria-label={d("stateLoading")}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Separator />
      </Block>

      <Block title="Dialog, Drawer, DropdownMenu, Toast">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild><Button variant="outline">{d("openDialog")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{d("dialogTitle")}</DialogTitle>
                <DialogDescription className="text-base">{d("dialogBody")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{d("cancel")}</Button></DialogClose>
                <DialogClose asChild><Button variant="destructive">{d("delete")}</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Drawer>
            <DrawerTrigger asChild><Button variant="outline">{d("openDrawer")}</Button></DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle className="font-heading text-xl">{t("journal.new")}</DrawerTitle>
                <DrawerDescription className="text-base">{formatDay("2026-11-04", locale, "weekday")}</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6"><Textarea aria-label={d("sampleNote")} placeholder={d("sampleNotePlaceholder")} /></div>
            </DrawerContent>
          </Drawer>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={d("openMenu")}><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem><Pencil aria-hidden="true" />{d("edit")}</DropdownMenuItem>
              <DropdownMenuItem><Heart aria-hidden="true" />{t("milestone.label")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive"><Trash2 aria-hidden="true" />{d("delete")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => toast.success(d("toastSample"))}>{d("showToast")}</Button>
        </div>
      </Block>

      <Block title="Popover, Calendar">
        <div className="grid gap-2">
          <Label htmlFor="d-date">{t("journal.date")}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="d-date" variant="outline" className="justify-start">
                <CalendarDays aria-hidden="true" />
                {date ? formatDay(date, locale) : t("journal.pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
        </div>
        <Calendar mode="single" selected={date} onSelect={setDate} className="edge rounded-lg" />
      </Block>
    </div>
  );
}
