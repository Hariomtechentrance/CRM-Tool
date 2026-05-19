import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { getApiError } from "@/lib/utils";
import type { Party, PartyType } from "@/types";

const schema = z.object({
  type:             z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  name:             z.string().min(2, "Name required"),
  displayName:      z.string().optional(),
  email:            z.string().email("Invalid email").optional().or(z.literal("")),
  phone:            z.string().optional(),
  mobile:           z.string().optional(),
  address:          z.string().optional(),
  city:             z.string().optional(),
  state:            z.string().optional(),
  country:          z.string().optional(),
  pincode:          z.string().optional(),
  gstin:            z.string().optional(),
  pan:              z.string().optional(),
  iecCode:          z.string().optional(),
  currency:         z.string().optional(),
  creditLimit:      z.coerce.number().nonnegative().optional(),
  paymentTermsDays: z.coerce.number().int().nonnegative().optional(),
  bankName:         z.string().optional(),
  bankAccount:      z.string().optional(),
  bankIfsc:         z.string().optional(),
  bankBranch:       z.string().optional(),
  notes:            z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TABS = ["Basic", "Address", "Business", "Banking"] as const;
type Tab = typeof TABS[number];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (party: Party) => void;
  party?: Party | null;
  defaultType?: PartyType;
}

export function PartyForm({ open, onClose, onSaved, party, defaultType = "CUSTOMER" }: Props) {
  const isEdit = !!party;
  const [tab, setTab] = useState<Tab>("Basic");
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, currency: "INR", country: "IN" },
  });

  useEffect(() => {
    if (open) {
      setTab("Basic");
      setApiError("");
      if (party) {
        reset({
          type: party.type,
          name: party.name,
          displayName: party.displayName ?? "",
          email: party.email ?? "",
          phone: party.phone ?? "",
          mobile: party.mobile ?? "",
          address: party.address ?? "",
          city: party.city ?? "",
          state: party.state ?? "",
          country: party.country ?? "IN",
          pincode: party.pincode ?? "",
          gstin: party.gstin ?? "",
          pan: party.pan ?? "",
          iecCode: party.iecCode ?? "",
          currency: party.currency ?? "INR",
          creditLimit: party.creditLimit ?? undefined,
          paymentTermsDays: party.paymentTermsDays ?? undefined,
          bankName: party.bankName ?? "",
          bankAccount: party.bankAccount ?? "",
          bankIfsc: party.bankIfsc ?? "",
          bankBranch: party.bankBranch ?? "",
          notes: party.notes ?? "",
        });
      } else {
        reset({ type: defaultType, currency: "INR", country: "IN" });
      }
    }
  }, [open, party, defaultType, reset]);

  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "" && v !== undefined));
      const res = isEdit
        ? await api.patch<{ data: Party }>(`/parties/${party!.id}`, clean)
        : await api.post<{ data: Party }>("/parties", clean);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      setApiError(getApiError(err));
    }
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${party!.name}` : "Add New Party"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? "Save Changes" : "Create Party"}
          </Button>
        </>
      }
    >
      {apiError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{apiError}</div>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
        {TABS.map((t) => <button key={t} type="button" className={tabClass(t)} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <form className="space-y-4">
        {/* ── Basic ── */}
        {tab === "Basic" && (
          <>
            <Select
              label="Party Type *"
              options={[{ value: "CUSTOMER", label: "Customer" }, { value: "SUPPLIER", label: "Supplier" }, { value: "BOTH", label: "Both (Customer & Supplier)" }]}
              value={watch("type")}
              onChange={(e) => setValue("type", e.target.value as PartyType)}
              error={errors.type?.message}
            />
            <Input label="Company / Party Name *" placeholder="ABC Traders Pvt Ltd" error={errors.name?.message} {...register("name")} />
            <Input label="Display Name" placeholder="Short name shown in lists" {...register("displayName")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" type="email" placeholder="info@abc.com" error={errors.email?.message} {...register("email")} />
              <Input label="Phone" placeholder="+91 9876543210" {...register("phone")} />
            </div>
            <Input label="Mobile" placeholder="+91 9876543210" {...register("mobile")} />
            <Textarea label="Internal Notes" placeholder="Any notes about this party..." {...register("notes")} />
          </>
        )}

        {/* ── Address ── */}
        {tab === "Address" && (
          <>
            <Textarea label="Street Address" placeholder="123, Main Street, Industrial Area" rows={2} {...register("address")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" placeholder="Mumbai" {...register("city")} />
              <Input label="State" placeholder="Maharashtra" {...register("state")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Country"
                options={[{ value: "IN", label: "India" }, { value: "US", label: "USA" }, { value: "GB", label: "UK" }, { value: "AE", label: "UAE" }, { value: "SG", label: "Singapore" }, { value: "CN", label: "China" }]}
                value={watch("country") || "IN"}
                onChange={(e) => setValue("country", e.target.value)}
              />
              <Input label="Pincode" placeholder="400001" {...register("pincode")} />
            </div>
          </>
        )}

        {/* ── Business ── */}
        {tab === "Business" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="GSTIN" placeholder="22AAAAA0000A1Z5" {...register("gstin")} />
              <Input label="PAN" placeholder="AAAAA0000A" {...register("pan")} />
            </div>
            <Input label="IEC Code" placeholder="Import Export Code" {...register("iecCode")} />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Currency"
                options={[{ value: "INR", label: "INR" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }, { value: "GBP", label: "GBP" }, { value: "AED", label: "AED" }]}
                value={watch("currency") || "INR"}
                onChange={(e) => setValue("currency", e.target.value)}
              />
              <Input label="Payment Terms (days)" type="number" placeholder="30" {...register("paymentTermsDays")} />
            </div>
            <Input label="Credit Limit" type="number" placeholder="100000" {...register("creditLimit")} />
          </>
        )}

        {/* ── Banking ── */}
        {tab === "Banking" && (
          <>
            <Input label="Bank Name" placeholder="HDFC Bank" {...register("bankName")} />
            <Input label="Account Number" placeholder="0012345678901234" {...register("bankAccount")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="IFSC Code" placeholder="HDFC0001234" {...register("bankIfsc")} />
              <Input label="Branch" placeholder="Andheri West, Mumbai" {...register("bankBranch")} />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
