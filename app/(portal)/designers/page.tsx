"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listUsers, type ApiUser } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader, StatusBadge } from "@/components/portal-ui";

export default function DesignersPage() {
	const { orders, user } = usePortal();
	const [designers, setDesigners] = useState<ApiUser[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		listUsers("designer").then(setDesigners).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load designers."));
	}, []);

	return <><PageHeader eyebrow="Team capacity" title="Designer performance" description="A clear view of today's assignments and throughput." action={user.role === "admin" ? <Link href="/designers/adddesigner" className="button button-primary">Add designer</Link> : undefined} /><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Today</p><h2>Production team</h2></div><span className="team-count">{designers.length} designers</span></div>{error ? <p className="form-error">{error}</p> : designers.length === 0 ? <div className="empty-state"><strong>No designers found</strong><p>Add a designer account to start assigning work.</p></div> : <div className="designer-list">{designers.map((designer) => { const assigned = orders.filter((order) => order.designer === designer.name); const completed = assigned.filter((order) => order.status === "Completed").length; return <div className="designer-row" key={designer._id}><div className="avatar avatar-large">{designer.name.slice(0, 1)}</div><div className="designer-name"><strong>{designer.name}</strong><span>{assigned.length ? `${assigned.length} assigned today` : "Available for assignment"}</span></div><div className="progress-wrap"><div className="progress"><span style={{ width: `${assigned.length ? Math.max(15, (completed / assigned.length) * 100) : 0}%` }} /></div><small>{completed}/{assigned.length} complete</small></div><StatusBadge status={assigned.length ? "In Design" : "Available"} /></div>; })}</div>}</section></>;
}