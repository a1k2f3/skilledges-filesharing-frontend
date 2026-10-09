"use client";

import { useEffect, useState } from "react";
import { listUsers, type ApiUser } from "@/components/api";
import { usePortal } from "@/components/portal-context";
import { LoadingIndicator, PageHeader, StatusBadge } from "@/components/portal-ui";

export default function CustomersPage() {
	const { user } = usePortal();
	const [customers, setCustomers] = useState<ApiUser[]>([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(user.role === "admin");

	useEffect(() => {
		if (user.role !== "admin") return;
		void listUsers("user")
			.then(setCustomers)
			.catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load customers."))
			.finally(() => setLoading(false));
	}, [user.role]);

	if (user.role !== "admin") {
		return <PageHeader eyebrow="Customer directory" title="Customers" description="This page is only available to administrators." />;
	}

	return <>
		<PageHeader eyebrow="Customer directory" title="Customers" description="View customer accounts and their account status." />
		{error && <p className="form-error" role="alert">{error}</p>}
		<section className="panel">
			<div className="panel-heading">
				<div><p className="eyebrow">Accounts</p><h2>Customer list</h2></div>
				<span className="team-count">{customers.length} customers</span>
			</div>
			{loading ? <LoadingIndicator label="Loading customers..." /> : customers.length ? (
				<div className="table-wrap">
					<table>
						<thead><tr><th>Customer</th><th>Username</th><th>Email</th><th>WhatsApp</th><th>Status</th></tr></thead>
						<tbody>{customers.map((customer) => (
							<tr key={customer._id}>
								<td><strong>{customer.name}</strong></td>
								<td>{customer.username ? `@${customer.username}` : "—"}</td>
								<td>{customer.email || "—"}</td>
								<td>{customer.whatsappNumber || "—"}</td>
								<td><StatusBadge status={customer.isActive ? "Active" : "Inactive"} /></td>
							</tr>
						))}</tbody>
					</table>
				</div>
			) : (
				<div className="empty-state"><strong>No customers found</strong><p>Customer accounts will appear here after an admin creates them.</p></div>
			)}
		</section>
	</>;
}
