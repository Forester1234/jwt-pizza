import React from "react";
import View from "./view";
import { useNavigate } from "react-router-dom";
import NotFound from "./notFound";
import Button from "../components/button";
import { pizzaService } from "../service/service";
import {
  Franchise,
  FranchiseList,
  Role,
  Store,
  User,
} from "../service/pizzaService";
import { TrashIcon } from "../icons";

interface Props {
  user: User | null;
}

export default function AdminDashboard(props: Props) {
  const navigate = useNavigate();
  const [franchiseList, setFranchiseList] = React.useState<FranchiseList>({
    franchises: [],
    more: false,
  });
  const [franchisePage, setFranchisePage] = React.useState(0);
  const filterFranchiseRef = React.useRef<HTMLInputElement>(null);
  const [users, setUsers] = React.useState<User[]>([]);
  const [userPage, setUserPage] = React.useState(1);
  const [userMore, setUserMore] = React.useState(false);
  const [userFilter, setUserFilter] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setFranchiseList(await pizzaService.getFranchises(franchisePage, 3, "*"));
    })();
  }, [props.user, franchisePage]);
  React.useEffect(() => {
    if (!Role.isRole(props.user, Role.Admin)) {
      return;
    }

    let cancelled = false;

    pizzaService
      .listUsers(userPage, 5, userFilter ? `*${userFilter}*` : "*")
      .then((result) => {
        if (!cancelled) {
          setUsers(result.users);
          setUserMore(result.more);
        }
      })
      .catch((error) => {
        console.error("Failed to load users:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [props.user, userPage, userFilter]);
  React.useEffect(() => {
    if (!Role.isRole(props.user, Role.Admin)) {
      return;
    }

    let cancelled = false;

    pizzaService
      .listUsers(userPage, 5, userFilter ? `*${userFilter}*` : "*")
      .then((result) => {
        if (!cancelled) {
          setUsers(result.users);
          setUserMore(result.more);
        }
      })
      .catch((error) => {
        console.error("Failed to load users:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [props.user, userPage, userFilter]);

  function createFranchise() {
    navigate("/admin-dashboard/create-franchise");
  }

  async function closeFranchise(franchise: Franchise) {
    navigate("/admin-dashboard/close-franchise", {
      state: { franchise: franchise },
    });
  }

  async function closeStore(franchise: Franchise, store: Store) {
    navigate("/admin-dashboard/close-store", {
      state: { franchise: franchise, store: store },
    });
  }

  async function filterFranchises() {
    setFranchiseList(
      await pizzaService.getFranchises(
        franchisePage,
        10,
        `*${filterFranchiseRef.current?.value}*`,
      ),
    );
  }

  async function deleteUser(user: User) {
    if (!user.id) {
      return;
    }

    try {
      await pizzaService.deleteUser(user.id);

      const result = await pizzaService.listUsers(
        userPage,
        5,
        userFilter ? `*${userFilter}*` : "*",
      );

      setUsers(result.users);
      setUserMore(result.more);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  let response = <NotFound />;
  if (Role.isRole(props.user, Role.Admin)) {
    response = (
      <View title="Mama Ricci's kitchen">
        <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
            <h3 className="text-neutral-100 text-xl">Users</h3>

            <div className="bg-neutral-100 overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-400 uppercase">
                  <tr>
                    {["Name", "Email", "Role", "Action"].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {users.map((listedUser) => (
                    <tr key={listedUser.id}>
                      <td className="px-6 py-3 text-sm text-gray-800">
                        {listedUser.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-800">
                        {listedUser.email}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-800">
                        {listedUser.roles?.map((role) => role.role).join(", ")}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Button
                          title="Delete"
                          onPress={() => deleteUser(listedUser)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-2 py-2">
                      <input
                        aria-label="Filter users by name"
                        type="text"
                        placeholder="Filter users by name"
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                        value={userFilter}
                        onChange={(event) => {
                          setUserPage(1);
                          setUserFilter(event.target.value);
                        }}
                      />
                    </td>
                    <td colSpan={2} className="text-end px-2 py-2">
                      <button
                        type="button"
                        aria-label="Previous users page"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((page) => page - 1)}
                      >
                        «
                      </button>
                      <span className="mx-2">{userPage}</span>
                      <button
                        type="button"
                        aria-label="Next users page"
                        disabled={!userMore}
                        onClick={() => setUserPage((page) => page + 1)}
                      >
                        »
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <h3 className="text-neutral-100 text-xl">Franchises</h3>
          <div className="bg-neutral-100 overflow-clip my-4">
            <div className="flex flex-col">
              <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                        <tr>
                          {[
                            "Franchise",
                            "Franchisee",
                            "Store",
                            "Revenue",
                            "Action",
                          ].map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="px-6 py-3 text-center text-xs font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      {franchiseList.franchises.map((franchise, findex) => {
                        return (
                          <tbody
                            key={findex}
                            className="divide-y divide-gray-200"
                          >
                            <tr className="border-neutral-500 border-t-2">
                              <td className="text-start px-2 whitespace-nowrap text-l font-mono text-orange-600">
                                {franchise.name}
                              </td>
                              <td
                                className="text-start px-2 whitespace-nowrap text-sm font-normal text-gray-800"
                                colSpan={3}
                              >
                                {franchise.admins
                                  ?.map((o) => o.name)
                                  .join(", ")}
                              </td>
                              <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                <button
                                  type="button"
                                  className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400  hover:border-orange-800 hover:text-orange-800"
                                  onClick={() => closeFranchise(franchise)}
                                >
                                  <TrashIcon />
                                  Close
                                </button>
                              </td>
                            </tr>

                            {franchise.stores.map((store, sindex) => {
                              return (
                                <tr key={sindex} className="bg-neutral-100">
                                  <td
                                    className="text-end px-2 whitespace-nowrap text-sm text-gray-800"
                                    colSpan={3}
                                  >
                                    {store.name}
                                  </td>
                                  <td className="text-end px-2 whitespace-nowrap text-sm text-gray-800">
                                    {store.totalRevenue?.toLocaleString()} ₿
                                  </td>
                                  <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                    <button
                                      type="button"
                                      className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                      onClick={() =>
                                        closeStore(franchise, store)
                                      }
                                    >
                                      <TrashIcon />
                                      Close
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        );
                      })}
                      <tfoot>
                        <tr>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              ref={filterFranchiseRef}
                              name="filterFranchise"
                              placeholder="Filter franchises"
                              className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                            />
                            <button
                              type="submit"
                              className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                              onClick={filterFranchises}
                            >
                              Submit
                            </button>
                          </td>
                          <td
                            colSpan={4}
                            className="text-end text-sm font-medium"
                          >
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300 "
                              onClick={() =>
                                setFranchisePage(franchisePage - 1)
                              }
                              disabled={franchisePage <= 0}
                            >
                              «
                            </button>
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                              onClick={() =>
                                setFranchisePage(franchisePage + 1)
                              }
                              disabled={!franchiseList.more}
                            >
                              »
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Button
            className="w-36 text-xs sm:text-sm sm:w-64"
            title="Add Franchise"
            onPress={createFranchise}
          />
        </div>
      </View>
    );
  }

  return response;
}
