import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Upload } from "lucide-react";
import { api, errorMessage, fieldErrors, openProtectedFile } from "../../api/client";
import { Button, Card, ErrorState, Field, Input, PageHeader, Spinner, useToast } from "../../components/ui";
import { useForm } from "../../hooks/useForm";

const EDITABLE = ["full_name", "father_name", "phone", "college", "course", "branch", "semester", "cgpa", "skills"];

export default function StudentProfile() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef(null);
  const { values, setValues, errors, setErrors, bind } = useForm({});
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["student-profile"],
    queryFn: async () => (await api.get("/students/profile")).data,
  });

  useEffect(() => {
    if (data && !loaded) {
      setValues(Object.fromEntries(EDITABLE.map((k) => [k, data[k] ?? ""])));
      setLoaded(true);
    }
  }, [data, loaded, setValues]);

  const save = useMutation({
    mutationFn: async () =>
      (await api.put("/students/profile", {
        ...values,
        semester: values.semester === "" ? null : Number(values.semester),
        cgpa: values.cgpa === "" ? null : Number(values.cgpa),
        skills: values.skills?.trim() || null,
      })).data,
    onSuccess: (profile) => {
      qc.setQueryData(["student-profile"], profile);
      toast.success("Profile saved.");
    },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });

  const upload = useMutation({
    mutationFn: async (file) => {
      const body = new FormData();
      body.append("file", file);
      return (await api.post("/students/resume", body)).data;
    },
    onSuccess: (profile) => { qc.setQueryData(["student-profile"], profile); toast.success("Resume uploaded."); },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading || !loaded) return isError ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : <Spinner />;

  return (
    <>
      <PageHeader title="My profile" subtitle="Recruiters see these details when you apply." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Roll number" htmlFor="roll"><Input id="roll" value={data.roll_number} disabled /></Field>
              <Field label="Email" htmlFor="mail"><Input id="mail" value={data.email} disabled /></Field>
              <Field label="Full name" htmlFor="full_name" error={errors.full_name}><Input {...bind("full_name")} required error={errors.full_name} /></Field>
              <Field label="Father's name" htmlFor="father_name" error={errors.father_name}><Input {...bind("father_name")} required error={errors.father_name} /></Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone}><Input {...bind("phone")} type="tel" required error={errors.phone} /></Field>
              <Field label="College" htmlFor="college" error={errors.college}><Input {...bind("college")} required error={errors.college} /></Field>
              <Field label="Degree / course" htmlFor="course" error={errors.course}><Input {...bind("course")} required error={errors.course} /></Field>
              <Field label="Branch" htmlFor="branch" error={errors.branch}><Input {...bind("branch")} required error={errors.branch} /></Field>
              <Field label="Semester" htmlFor="semester" error={errors.semester}><Input {...bind("semester")} type="number" min="1" max="12" error={errors.semester} /></Field>
              <Field label="CGPA" htmlFor="cgpa" error={errors.cgpa}><Input {...bind("cgpa")} type="number" step="0.01" min="0" max="10" error={errors.cgpa} /></Field>
            </div>
            <Field label="Skills" htmlFor="skills" error={errors.skills} hint="Separate with commas"><Input {...bind("skills")} error={errors.skills} /></Field>
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        </Card>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold">Resume</h2>
          <p className="mt-1 text-sm text-muted">PDF only, up to 2 MB. Recruiters you apply to can open it.</p>
          <p className="mt-4 text-sm font-medium">{data.has_resume ? "A resume is uploaded." : "No resume uploaded yet."}</p>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose resume PDF"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" loading={upload.isPending} onClick={() => fileRef.current.click()}>
              <Upload className="h-4 w-4" /> {data.has_resume ? "Replace" : "Upload"}
            </Button>
            {data.has_resume && (
              <Button variant="ghost" onClick={() => openProtectedFile("/students/resume").catch((e) => toast.error(errorMessage(e)))}>
                <Eye className="h-4 w-4" /> View
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
