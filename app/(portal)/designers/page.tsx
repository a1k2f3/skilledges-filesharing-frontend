"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDesigner, listDesigners, setDesignerActive, type ApiUser } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { PageHeader, StatusBadge } from "@/components/portal-ui";

export default function DesignersPage() {
	const { orders, user } = usePortal();
	const [designers, setDesigners] = useState<ApiUser[]>([]);
	const [error, setError] = useState("");
	const [updatingId, setUpdatingId] = useState("");

	useEffect(() => {
		listDesigners(true).then(setDesigners).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load designers."));
	}, []);

	async function toggleDesigner(designer: ApiUser) {
		const isActive = !designer.isActive;
		if (!isActive && !window.confirm(`Deactivate designer ${designer.name}? They will lose access to their account.`)) return;
		setUpdatingId(designer._id);
		setError("");
		try {
			await setDesignerActive(designer._id, isActive);
			setDesigners((current) => current.map((item) => item._id === designer._id ? { ...item, isActive } : item));
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : `Unable to ${isActive ? "activate" : "deactivate"} designer.`);
		} finally {
			setUpdatingId("");
		}
	}

	async function removeDesigner(designer: ApiUser) {
		if (!window.confirm(`Permanently delete designer ${designer.name}? Their account will be removed, active assignments cleared, and team ownership transferred to you where needed.`)) return;
		setUpdatingId(designer._id);
		setError("");
		try {
			await deleteDesigner(designer._id);
			setDesigners((current) => current.filter((item) => item._id !== designer._id));
		} catch (requestError) {
			setError(requestError instanceof Error ? requestError.message : "Unable to remove designer.");
		} finally {
			setUpdatingId("");
		}
	}

	return <>
		<PageHeader eyebrow="Team capacity" title="Designer performance" description="A clear view of today's assignments and throughput." action={user.role === "admin" ? <Link href="/designers/adddesigner" className="button button-primary">Add designer</Link> : undefined} />
		<section className="panel">
			<div className="panel-heading">
				<div><p className="eyebrow">Today</p><h2>Production team</h2></div>
				<span className="team-count">{designers.length} designers</span>
			</div>
			{error ? <p className="form-error">{error}</p> : designers.length === 0 ? (
				<div className="empty-state"><strong>No designers found</strong><p>Add a designer account to start assigning work.</p></div>
			) : (
				<div className="designer-list">
					{designers.map((designer) => {
						const assigned = orders.filter((order) => order.designerId === designer._id);
						const completed = assigned.filter((order) => order.status === "Completed").length;
						return <div className="designer-row" key={designer._id}>
							<div className="avatar avatar-large">{designer.name.slice(0, 1)}</div>
							<div className="designer-name">
								<strong>{designer.name}</strong>
								<span>{!designer.isActive ? "Inactive account" : assigned.length ? `${assigned.length} assigned today` : "Available for assignment"}</span>
							</div>
							<div className="progress-wrap">
								<div className="progress"><span style={{ width: `${assigned.length ? Math.max(15, (completed / assigned.length) * 100) : 0}%` }} /></div>
								<small>{completed}/{assigned.length} complete</small>
							</div>
							<StatusBadge status={!designer.isActive ? "Inactive" : assigned.length ? "In Design" : "Available"} />
							{user.role === "admin" && <>
								<button className={`text-button${designer.isActive ? " danger-text" : ""}`} type="button" disabled={updatingId === designer._id} onClick={() => void toggleDesigner(designer)}>
									{updatingId === designer._id ? "Updating..." : designer.isActive ? "Deactivate" : "Activate"}
								</button>
								<button className="text-button danger-text" type="button" disabled={updatingId === designer._id} onClick={() => void removeDesigner(designer)}>
									{updatingId === designer._id ? "Removing..." : "Remove"}
								</button>
							</>}
						</div>;
					})}
				</div>
			)}
		</section>
	</>;
}