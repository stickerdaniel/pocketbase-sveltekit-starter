<script lang="ts">
	import { onDestroy } from "svelte";
	import BadgeCheck from "lucide-svelte/icons/badge-check";
	import Bell from "lucide-svelte/icons/bell";
	import ChevronsUpDown from "lucide-svelte/icons/chevrons-up-down";
	import CreditCard from "lucide-svelte/icons/credit-card";
	import LogOut from "lucide-svelte/icons/log-out";
	import LogIn from "lucide-svelte/icons/log-in";
	import Sparkles from "lucide-svelte/icons/sparkles";
	import User from "lucide-svelte/icons/user";

	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { Button } from "$lib/components/ui/button";
	import { authModel, client } from "$lib/pocketbase";
	import { toast } from "svelte-sonner";
	import LoginForm from "$lib/components/LoginForm.svelte";

	let { signupAllowed = true } = $props();
	const sidebar = useSidebar();

	// Auth-related functions
	async function logout() {
		client.authStore.clear();
	}

	const unsubscribe = client.authStore.onChange((token, model) => {
		if (model) {
			const { name, username } = model;
			toast.success(`Signed in as ${name || username || "Admin"}`);
		} else {
			toast.success(`Signed out`);
		}
	}, false);

	onDestroy(() => {
		unsubscribe();
	});

	// User data
	let userData = $derived({
		name: $authModel?.name || $authModel?.username || "Guest",
		email: $authModel?.email || "Not logged in",
		avatar: $authModel?.avatar ? client.getFileUrl($authModel, $authModel.avatar) : ""
	});
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		{#if $authModel}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							{...props}
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar.Root class="h-8 w-8 rounded-lg">
								{#if userData.avatar}
									<Avatar.Image src={userData.avatar} alt={userData.name} />
								{:else}
									<Avatar.Fallback class="rounded-lg">
										<User class="size-4" />
									</Avatar.Fallback>
								{/if}
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{userData.name}</span>
								<span class="truncate text-xs">{userData.email}</span>
							</div>
							<ChevronsUpDown class="ml-auto size-4" />
						</Sidebar.MenuButton>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
					side={sidebar.isMobile ? "bottom" : "right"}
					align="end"
					sideOffset={4}
				>
					<DropdownMenu.Label class="p-0 font-normal">
						<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
							<Avatar.Root class="h-8 w-8 rounded-lg">
								{#if userData.avatar}
									<Avatar.Image src={userData.avatar} alt={userData.name} />
								{:else}
									<Avatar.Fallback class="rounded-lg">
										<User class="size-4" />
									</Avatar.Fallback>
								{/if}
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{userData.name}</span>
								<span class="truncate text-xs">{userData.email}</span>
							</div>
						</div>
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.Item>
							<BadgeCheck />
							Profile
						</DropdownMenu.Item>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={logout}>
						<LogOut />
						Log out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<Dialog.Root>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton {...props} size="lg">
							<Avatar.Root class="h-8 w-8 rounded-lg">
								<Avatar.Fallback class="rounded-lg">
									<User class="size-4" />
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">Not logged in</span>
								<span class="text-xs">Sign in to continue</span>
							</div>
							<LogIn class="ml-auto size-4" />
						</Sidebar.MenuButton>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content class="max-w-sm">
					<LoginForm {signupAllowed} />
				</Dialog.Content>
			</Dialog.Root>
		{/if}
	</Sidebar.MenuItem>
</Sidebar.Menu>
