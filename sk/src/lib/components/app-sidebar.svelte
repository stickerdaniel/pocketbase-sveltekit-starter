<script lang="ts" module>
	import Home from "lucide-svelte/icons/home";
	import FileText from "lucide-svelte/icons/file-text";
	import Bot from "lucide-svelte/icons/bot";
	import Settings2 from "lucide-svelte/icons/settings-2";
	import BookOpen from "lucide-svelte/icons/book-open";
	import LifeBuoy from "lucide-svelte/icons/life-buoy";
	import Send from "lucide-svelte/icons/send";
	import Frame from "lucide-svelte/icons/frame";
	import ChartPie from "lucide-svelte/icons/chart-pie";
	import Map from "lucide-svelte/icons/map";
	import Database from "lucide-svelte/icons/database";
	import { base } from "$app/paths";

	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{
				title: "Home",
				url: `${base}/`,
				icon: Home,
				isActive: true,
			},
			{
				title: "Posts",
				url: `${base}/posts`,
				icon: FileText,
				items: [
					{
						title: "All Posts",
						url: `${base}/posts`,
					},
					{
						title: "Create Post",
						url: `${base}/posts/new/edit`,
					}
				],
			},
			{
				title: "Hello",
				url: `${base}/hello`,
				icon: Bot,
			},
			{
				title: "Admin",
				url: "#",
				icon: Database,
				items: [
					{
						title: "Audit Log",
						url: `${base}/auditlog/users/1`,
					},
				]
			},
			{
				title: "Documentation",
				url: "#",
				icon: BookOpen,
				items: [
					{
						title: "Introduction",
						url: "#",
					},
					{
						title: "Get Started",
						url: "#",
					},
					{
						title: "Tutorials",
						url: "#",
					},
					{
						title: "Changelog",
						url: "#",
					},
				],
			},
			{
				title: "Settings",
				url: "#",
				icon: Settings2,
				items: [
					{
						title: "General",
						url: "#",
					},
					{
						title: "Team",
						url: "#",
					},
					{
						title: "Billing",
						url: "#",
					},
					{
						title: "Limits",
						url: "#",
					},
				],
			},
		],
		navSecondary: [
			{
				title: "Support",
				url: "#",
				icon: LifeBuoy,
			},
			{
				title: "Feedback",
				url: "#",
				icon: Send,
			},
		],
		projects: [
			{
				name: "Design Engineering",
				url: "#",
				icon: Frame,
			},
			{
				name: "Sales & Marketing",
				url: "#",
				icon: ChartPie,
			},
			{
				name: "Travel",
				url: "#",
				icon: Map,
			},
		],
	};
</script>

<script lang="ts">
	import NavMain from "$lib/components/nav-main.svelte";
	import NavProjects from "$lib/components/nav-projects.svelte";
	import NavSecondary from "$lib/components/nav-secondary.svelte";
	import NavUser from "$lib/components/nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import Command from "lucide-svelte/icons/command";
	import type { ComponentProps } from "svelte";

	let { 
		ref = $bindable(null), 
		signupAllowed = true,
		...restProps 
	}: ComponentProps<typeof Sidebar.Root> & { signupAllowed?: boolean } = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href={`${base}/`} {...props}>
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								<Command class="size-4" />
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">PocketBase SK</span>
								<span class="truncate text-xs">Starter Kit</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		<NavProjects projects={data.projects} />
		<NavSecondary items={data.navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {signupAllowed} />
	</Sidebar.Footer>
</Sidebar.Root>