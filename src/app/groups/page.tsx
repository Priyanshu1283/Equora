"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Users, PlusCircle, ArrowRight, Shield } from "lucide-react";

export default function GroupsListPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (!session?.user) {
          router.push("/login");
        } else {
          setUser(session.user);
          fetchGroups();
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} onOpenCreateGroup={() => setCreateModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              My Groups
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              All groups you are actively participating in.
            </p>
          </div>

          <Button onClick={() => setCreateModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Create Group
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading your groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No groups yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t joined or created any groups. Create your first group
              to start tracking shared expenses.
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Create Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Link
                key={group._id}
                href={`/groups/${group._id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-950">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="neutral">{group.groupType}</Badge>
                      {group.role === "ADMIN" && (
                        <span
                          className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
                          title="You are Group Admin"
                        >
                          <Shield className="h-3 w-3 mr-0.5" />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => fetchGroups()}
      />
    </div>
  );
}
