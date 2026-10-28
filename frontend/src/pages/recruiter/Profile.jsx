import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { api, errorMessage, fieldErrors } from "../../api/client";
import { CompanyLogo } from "../../components/OpportunityCard";
import { Button, Card, ErrorState, Field, Input, PageHeader, Spinner, Textarea, useToast } from "../../components/ui";
import { useForm } from "../../hooks/useForm";

export default function RecruiterProfile() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef(null);
  const { values, setValues, errors, setErrors, bind } = useForm({});
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["recruiter-profile"],
    queryFn: async () => (await api.get("/recruiters/profile")).data,
  });
  useEffect(() => {
    if (data && !loaded) {
      setValues({
        full_name: data.full_name, designation: data.designation || "", phone: data.phone || "",
        company_name: data.company?.name || "", company_description: data.company?.description || "",
        company_website: data.company?.website || "", company_location: data.company?.location || "",
      });
      setLoaded(true);
    }
  }, [data, loaded, setValues]);

  const blank = (v) => (v && v.trim() ? v.trim() : null);
  const save = useMutation({
    mutationFn: async () => (await api.put("/recruiters/profile", {
      ...values, designation: blank(values.designation), company_description: blank(values.company_description),
      company_website: blank(values.company_website), company_location: blank(values.company_location),
    })).data,
    onSuccess: (p) => { qc.setQueryData(["recruiter-profile"], p); toast.success("Profile saved."); },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });
  const logo = useMutation({
    mutationFn: async (file) => { const b = new FormData(); b.append("file", file); return (await api.post("/recruiters/company/logo", b)).data; },
    onSuccess: (p) => { qc.setQueryData(["recruiter-profile"], p); toast.success("Logo updated."); },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading || !loaded) return isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : <Spinner />;

  return (
    <>
      <PageHeader title="Company and profile" subtitle="Students see your company details on every posting." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <h2 className="font-semibold">Company</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" htmlFor="company_name" error={errors.company_name}><Input {...bind("company_name")} required minLength={2} error={errors.company_name} /></Field>
              <Field label="Location" htmlFor="company_location" error={errors.company_location}><Input {...bind("company_location")} error={errors.company_location} /></Field>
            </div>
            <Field label="Website" htmlFor="company_website" error={errors.company_website}><Input {...bind("company_website")} type="url" error={errors.company_website} /></Field>
            <Field label="About the company" htmlFor="company_description" error={errors.company_description}><Textarea {...bind("company_description")} rows={5} error={errors.company_description} /></Field>
            <h2 className="pt-2 font-semibold">You</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="mail"><Input id="mail" value={data.email} disabled /></Field>
              <Field label="Full name" htmlFor="full_name" error={errors.full_name}><Input {...bind("full_name")} required error={errors.full_name} /></Field>
              <Field label="Designation" htmlFor="designation" error={errors.designation}><Input {...bind("designation")} error={errors.designation} /></Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone}><Input {...bind("phone")} type="tel" required error={errors.phone} /></Field>
            </div>
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        </Card>
        <Card className="h-fit">
          <h2 className="text-lg font-semibold">Company logo</h2>
          <p className="mt-1 text-sm text-muted">PNG or JPG, up to 1 MB.</p>
          <div className="mt-4"><CompanyLogo company={{ name: values.company_name || "C", logo_url: data.company?.logo_url }} size="h-20 w-20" /></div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" aria-label="Choose logo image"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) logo.mutate(f); e.target.value = ""; }} />
          <Button variant="secondary" className="mt-4" loading={logo.isPending} onClick={() => fileRef.current.click()}><Upload className="h-4 w-4" /> Upload logo</Button>
        </Card>
      </div>
    </>
  );
}
