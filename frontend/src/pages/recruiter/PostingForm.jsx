import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage, fieldErrors } from "../../api/client";
import { isoToLocal, localToIso } from "../../api/format";
import { Button, Card, ErrorState, Field, Input, PageHeader, Select, Spinner, Textarea, useToast } from "../../components/ui";
import { useForm } from "../../hooks/useForm";

const EMPTY = { type: "job", title: "", description: "", skills: "", location: "", compensation: "", min_cgpa: "", eligible_branches: "", deadline: "" };

export default function PostingForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { values, setValues, errors, setErrors, bind } = useForm(EMPTY);
  const [loaded, setLoaded] = useState(!editing);

  const existing = useQuery({
    queryKey: ["opportunity", id], enabled: editing,
    queryFn: async () => (await api.get(`/opportunities/${id}`)).data,
  });
  useEffect(() => {
    if (existing.data && !loaded) {
      const o = existing.data;
      setValues({
        type: o.type, title: o.title, description: o.description, skills: o.skills || "", location: o.location || "",
        compensation: o.compensation || "", min_cgpa: o.min_cgpa ?? "", eligible_branches: o.eligible_branches || "",
        deadline: isoToLocal(o.deadline),
      });
      setLoaded(true);
    }
  }, [existing.data, loaded, setValues]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...values,
        skills: values.skills.trim() || null, location: values.location.trim() || null,
        compensation: values.compensation.trim() || null, eligible_branches: values.eligible_branches.trim() || null,
        min_cgpa: values.min_cgpa === "" ? null : Number(values.min_cgpa), deadline: localToIso(values.deadline),
      };
      return editing ? api.put(`/opportunities/${id}`, body) : api.post("/opportunities", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Posting updated." : "Posting published. Students can see it now.");
      ["my-postings", "recruiter-stats", "opportunity", "opportunities", "applicant-postings"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate("/recruiter/postings");
    },
    onError: (err) => { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); },
  });

  if (existing.isError) return <ErrorState message={errorMessage(existing.error)} />;
  if (!loaded) return <Spinner />;
  const money = values.type === "job" ? "Package" : "Stipend";

  return (
    <>
      <Link to="/recruiter/postings" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-campus-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Postings</Link>
      <PageHeader title={editing ? "Edit posting" : "Post a job or internship"} subtitle="Your company name and logo are added automatically from your company profile." />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" htmlFor="type" error={errors.type}>
              <Select {...bind("type")} error={errors.type}><option value="job">Job (full-time)</option><option value="internship">Internship</option></Select>
            </Field>
            <Field label="Title" htmlFor="title" error={errors.title} className="sm:col-span-2">
              <Input {...bind("title")} required minLength={3} placeholder="e.g. Backend Developer" error={errors.title} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description} hint="Responsibilities, selection process and anything students should know (min. 20 characters).">
            <Textarea {...bind("description")} required minLength={20} rows={7} error={errors.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location" htmlFor="location" error={errors.location}><Input {...bind("location")} placeholder="Ludhiana / Remote" error={errors.location} /></Field>
            <Field label={`${money} (as text)`} htmlFor="compensation" error={errors.compensation}>
              <Input {...bind("compensation")} placeholder={values.type === "job" ? "e.g. 6 LPA" : "e.g. ₹15,000 / month"} error={errors.compensation} />
            </Field>
            <Field label="Skills required" htmlFor="skills" error={errors.skills} hint="Separate with commas"><Input {...bind("skills")} placeholder="Python, SQL, React" error={errors.skills} /></Field>
            <Field label="Application deadline" htmlFor="deadline" error={errors.deadline}><Input {...bind("deadline")} type="datetime-local" required error={errors.deadline} /></Field>
            <Field label="Minimum CGPA" htmlFor="min_cgpa" error={errors.min_cgpa} hint="Leave empty for no CGPA limit"><Input {...bind("min_cgpa")} type="number" step="0.01" min="0" max="10" error={errors.min_cgpa} /></Field>
            <Field label="Eligible branches" htmlFor="eligible_branches" error={errors.eligible_branches} hint="Comma-separated, matching what students enter. Empty = all branches">
              <Input {...bind("eligible_branches")} placeholder="Computer Science, IT" error={errors.eligible_branches} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <Link to="/recruiter/postings" className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-paper">Cancel</Link>
            <Button type="submit" loading={save.isPending}>{editing ? "Save changes" : "Publish"}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
