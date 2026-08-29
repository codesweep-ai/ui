import { useState, useMemo } from "react";
import {
  SplitPane,
  Table,
  Card,
  CardGroup,
  StatusBadge,
} from "@codesweep-ai/ui";
import { CodeBlock } from "@codesweep-ai/ui/code";
import {
  classRecords,
  type ClassRecord,
  departments,
  type Department,
  type Team,
  type TeamMember,
} from "../../data/patternFixtures";

/* ── Flat Master-Detail (existing) ─────────────────────── */

function FlatMasterDetail() {
  const [selectedName, setSelectedName] = useState<string | null>(
    "UserService"
  );
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const sorted = useMemo(() => {
    const copy = [...classRecords];
    copy.sort((a, b) => {
      const key = sort.columnId as keyof ClassRecord;
      const av = a[key];
      const bv = b[key];
      if (typeof av === "string" && typeof bv === "string") {
        return sort.direction === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      return 0;
    });
    return copy;
  }, [sort]);

  const selected = classRecords.find((r) => r.name === selectedName) ?? null;

  return (
    <SplitPane
      className="cs-preview-pages-patterns-master-detail-demo-15"
      panes={[
        {
          id: "list",
          defaultWidth: 420,
          minWidth: 300,
          maxWidth: 600,
          children: (
            <div className="cs-preview-pages-patterns-master-detail-demo-17 ">
              <Table<ClassRecord>
                columns={[
                  {
                    id: "name",
                    header: "Name",
                    sortable: true,
                    cell: (row) => row.name,
                  },
                  {
                    id: "package",
                    header: "Package",
                    sortable: true,
                    cell: (row) => (
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        {row.package}
                      </span>
                    ),
                  },
                  {
                    id: "methods",
                    header: "Methods",
                    sortable: true,
                    align: "right",
                    width: "80px",
                    cell: (row) => row.methods,
                  },
                  {
                    id: "status",
                    header: "Status",
                    sortable: false,
                    width: "100px",
                    cell: (row) => (
                      <StatusBadge
                        label={row.status}
                        status={row.status}
                      />
                    ),
                  },
                ]}
                data={sorted}
                rowKey={(row) => row.name}
                sort={sort}
                onSort={(columnId, direction) =>
                  setSort({ columnId, direction })
                }
                onRowClick={(row) => setSelectedName(row.name)}
                selectedKey={selectedName}
              />
            </div>
          ),
        },
        {
          id: "detail",
          children: (
            <div className="cs-preview-pages-patterns-master-detail-demo-17 ">
              {selected ? (
                <Card header={selected.name}>
                  <div className="cs-preview-pages-patterns-master-detail-demo-31 ">
                    <div className="cs-preview-pages-patterns-master-detail-demo-32 ">
                      <StatusBadge
                        label={selected.status}
                        status={selected.status}
                      />
                      <span className="cs-preview-pages-patterns-master-detail-demo-33 ">
                        {selected.package}
                      </span>
                    </div>
                    <p className="cs-preview-pages-patterns-master-detail-demo-34 ">
                      {selected.description}
                    </p>
                    <div className="cs-preview-pages-patterns-master-detail-demo-35 ">
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        Methods:{" "}
                        <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                          {selected.methods}
                        </span>
                      </span>
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        Fields:{" "}
                        <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                          {selected.fields}
                        </span>
                      </span>
                    </div>
                    <CodeBlock
                      code={selected.code}
                      language="typescript"
                      source={`${selected.package}/${selected.name}.ts`}
                    />
                  </div>
                </Card>
              ) : (
                <div className="cs-preview-pages-patterns-master-detail-demo-43 ">
                  Select a class from the table
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

/* ── Nested Master-Detail ──────────────────────────────── */

function sortRows<T>(
  data: T[],
  sort: { columnId: string; direction: "asc" | "desc" }
): T[] {
  const copy = [...data];
  copy.sort((a, b) => {
    const key = sort.columnId as keyof T;
    const av = a[key];
    const bv = b[key];
    if (typeof av === "string" && typeof bv === "string") {
      return sort.direction === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    }
    if (typeof av === "number" && typeof bv === "number") {
      return sort.direction === "asc" ? av - bv : bv - av;
    }
    return 0;
  });
  return copy;
}

function NestedMasterDetail() {
  const [selectedDept, setSelectedDept] = useState<string | null>("Platform");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const [deptSort, setDeptSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const [teamSort, setTeamSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const [memberSort, setMemberSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const sortedDepts = useMemo(
    () => sortRows(departments, deptSort),
    [deptSort]
  );

  const dept: Department | null =
    departments.find((d) => d.name === selectedDept) ?? null;

  const sortedTeams = useMemo(
    () => (dept ? sortRows(dept.teams, teamSort) : []),
    [dept, teamSort]
  );

  const team: Team | null =
    dept?.teams.find((t) => t.name === selectedTeam) ?? null;

  const sortedMembers = useMemo(
    () => (team ? sortRows(team.members, memberSort) : []),
    [team, memberSort]
  );

  const handleDeptClick = (d: Department) => {
    setSelectedDept(d.name);
    setSelectedTeam(null);
  };

  return (
    <SplitPane
      className="cs-preview-pages-patterns-master-detail-demo-15"
      panes={[
        {
          id: "dept-list",
          defaultWidth: 360,
          minWidth: 280,
          maxWidth: 500,
          children: (
            <div className="cs-preview-pages-patterns-master-detail-demo-17 ">
              <Table<Department>
                columns={[
                  {
                    id: "name",
                    header: "Department",
                    sortable: true,
                    cell: (row) => row.name,
                  },
                  {
                    id: "headcount",
                    header: "People",
                    sortable: true,
                    align: "right",
                    width: "80px",
                    cell: (row) => row.headcount,
                  },
                  {
                    id: "totalCommits",
                    header: "Commits",
                    sortable: true,
                    align: "right",
                    width: "90px",
                    cell: (row) => row.totalCommits.toLocaleString(),
                  },
                ]}
                data={sortedDepts}
                rowKey={(row) => row.name}
                sort={deptSort}
                onSort={(columnId, direction) =>
                  setDeptSort({ columnId, direction })
                }
                onRowClick={handleDeptClick}
                selectedKey={selectedDept}
              />
            </div>
          ),
        },
        {
          id: "detail",
          children: (
            <div className="cs-preview-pages-patterns-master-detail-demo-17 ">
              {dept ? (
                <div className="cs-preview-pages-patterns-master-detail-demo-77 ">
                  {/* Department header */}
                  <div className="cs-preview-pages-patterns-master-detail-demo-78 ">
                    <span className="cs-preview-pages-patterns-master-detail-demo-79 ">
                      {dept.name}
                    </span>
                    <div className="cs-preview-pages-patterns-master-detail-demo-35 ">
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        Budget:{" "}
                        <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                          {dept.budget}
                        </span>
                      </span>
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        Headcount:{" "}
                        <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                          {dept.headcount}
                        </span>
                      </span>
                      <span className="cs-preview-pages-patterns-master-detail-demo-22">
                        Commits:{" "}
                        <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                          {dept.totalCommits.toLocaleString()}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Teams table (Master 2) */}
                  <Table<Team>
                    columns={[
                      {
                        id: "name",
                        header: "Team",
                        sortable: true,
                        cell: (row) => row.name,
                      },
                      {
                        id: "lead",
                        header: "Lead",
                        sortable: true,
                        cell: (row) => (
                          <span className="cs-preview-pages-patterns-master-detail-demo-22">
                            {row.lead}
                          </span>
                        ),
                      },
                      {
                        id: "totalCommits",
                        header: "Commits",
                        sortable: true,
                        align: "right",
                        width: "90px",
                        cell: (row) => row.totalCommits.toLocaleString(),
                      },
                      {
                        id: "openPRs",
                        header: "Open PRs",
                        sortable: true,
                        align: "right",
                        width: "90px",
                        cell: (row) => row.openPRs,
                      },
                    ]}
                    data={sortedTeams}
                    rowKey={(row) => row.name}
                    sort={teamSort}
                    onSort={(columnId, direction) =>
                      setTeamSort({ columnId, direction })
                    }
                    onRowClick={(row) => setSelectedTeam(row.name)}
                    selectedKey={selectedTeam}
                  />

                  {/* Team detail: members */}
                  {team ? (
                    <div className="cs-preview-pages-patterns-master-detail-demo-31 ">
                      <div className="cs-preview-pages-patterns-master-detail-demo-32 ">
                        <span className="cs-preview-pages-patterns-master-detail-demo-95 ">
                          {team.name}
                        </span>
                        <StatusBadge
                          label={`${team.members.length} members`}
                          status="neutral"
                        />
                        <StatusBadge
                          label={`${team.openPRs} open PRs`}
                          status={team.openPRs > 5 ? "warning" : "success"}
                        />
                      </div>
                      <Table<TeamMember>
                        columns={[
                          {
                            id: "name",
                            header: "Name",
                            sortable: true,
                            cell: (row) => row.name,
                          },
                          {
                            id: "role",
                            header: "Role",
                            sortable: true,
                            cell: (row) => (
                              <span className="cs-preview-pages-patterns-master-detail-demo-22">
                                {row.role}
                              </span>
                            ),
                          },
                          {
                            id: "commits",
                            header: "Commits",
                            sortable: true,
                            align: "right",
                            width: "90px",
                            cell: (row) => row.commits,
                          },
                          {
                            id: "reviews",
                            header: "Reviews",
                            sortable: true,
                            align: "right",
                            width: "90px",
                            cell: (row) => row.reviews,
                          },
                          {
                            id: "status",
                            header: "Status",
                            sortable: false,
                            width: "100px",
                            cell: (row) => (
                              <StatusBadge
                                label={row.status}
                                status={row.status}
                              />
                            ),
                          },
                        ]}
                        data={sortedMembers}
                        rowKey={(row) => row.name}
                        sort={memberSort}
                        onSort={(columnId, direction) =>
                          setMemberSort({ columnId, direction })
                        }
                      />
                    </div>
                  ) : (
                    <div className="cs-preview-pages-patterns-master-detail-demo-118 ">
                      Select a team to view members
                    </div>
                  )}
                </div>
              ) : (
                <div className="cs-preview-pages-patterns-master-detail-demo-43 ">
                  Select a department from the table
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

/* ── Long List Nested Master-Detail ────────────────────── */

// Generate many teams so the Level 2 table exceeds viewport height
function makeLongTeamList(): Team[] {
  const roles = ["Tech Lead", "Senior Engineer", "Engineer", "Junior Engineer", "SRE", "DevOps"];
  const firstNames = ["Alex", "Blake", "Casey", "Drew", "Eli", "Fran", "Gray", "Harper", "Ira", "Jordan", "Kai", "Lane", "Morgan", "Nico", "Oakley", "Parker", "Quinn", "Reese", "Sage", "Taylor"];
  const teamNames = [
    "Core API", "Infrastructure", "Data Pipeline", "Frontend", "Design Systems",
    "Mobile", "Search", "Payments", "Notifications", "Analytics",
    "Auth", "DevTools", "CI/CD", "Observability", "Edge Network",
    "Content Delivery", "Machine Learning", "Integrations", "Billing", "Compliance",
  ];
  return teamNames.map((name, i) => {
    const memberCount = 3 + (i % 3);
    const members: TeamMember[] = Array.from({ length: memberCount }, (_, j) => ({
      name: firstNames[(i * 3 + j) % firstNames.length] + " " + String.fromCharCode(65 + ((i + j) % 26)) + ".",
      role: roles[(i + j) % roles.length],
      status: (["success", "success", "warning", "neutral"] as const)[(i + j) % 4],
      commits: 80 + ((i * 17 + j * 31) % 200),
      reviews: 15 + ((i * 13 + j * 7) % 60),
    }));
    return {
      name,
      lead: members[0].name,
      members,
      totalCommits: members.reduce((s, m) => s + m.commits, 0),
      openPRs: 1 + (i % 8),
    };
  });
}

const longTeams = makeLongTeamList();

function LongListMasterDetail() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const [teamSort, setTeamSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const [memberSort, setMemberSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const sortedTeams = useMemo(
    () => sortRows(longTeams, teamSort),
    [teamSort]
  );

  const team: Team | null =
    longTeams.find((t) => t.name === selectedTeam) ?? null;

  const sortedMembers = useMemo(
    () => (team ? sortRows(team.members, memberSort) : []),
    [team, memberSort]
  );

  return (
    <SplitPane
      className="cs-preview-pages-patterns-master-detail-demo-15"
      panes={[
        {
          id: "team-list",
          defaultWidth: 360,
          minWidth: 280,
          maxWidth: 500,
          children: (
            <div className="cs-preview-pages-patterns-master-detail-demo-17 ">
              <Table<Team>
                columns={[
                  {
                    id: "name",
                    header: "Team",
                    sortable: true,
                    cell: (row) => row.name,
                  },
                  {
                    id: "totalCommits",
                    header: "Commits",
                    sortable: true,
                    align: "right",
                    cell: (row) => row.totalCommits.toLocaleString(),
                  },
                  {
                    id: "openPRs",
                    header: "PRs",
                    sortable: true,
                    align: "right",
                    cell: (row) => row.openPRs,
                  },
                ]}
                data={sortedTeams}
                rowKey={(row) => row.name}
                sort={teamSort}
                onSort={(columnId, direction) =>
                  setTeamSort({ columnId, direction })
                }
                onRowClick={(row) => setSelectedTeam(row.name)}
                selectedKey={selectedTeam}
              />
            </div>
          ),
        },
        {
          id: "team-detail",
          children: selectedTeam && team ? (
            <div className="cs-preview-pages-patterns-master-detail-demo-189 ">
              {/* Top half: team info + members table */}
              <div className="cs-preview-pages-patterns-master-detail-demo-190 ">
                <div className="cs-preview-pages-patterns-master-detail-demo-191 ">
                  <span className="cs-preview-pages-patterns-master-detail-demo-79 ">
                    {team.name}
                  </span>
                  <div className="cs-preview-pages-patterns-master-detail-demo-192 ">
                    <span className="cs-preview-pages-patterns-master-detail-demo-22">
                      Lead:{" "}
                      <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                        {team.lead}
                      </span>
                    </span>
                    <span className="cs-preview-pages-patterns-master-detail-demo-22">
                      Commits:{" "}
                      <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                        {team.totalCommits.toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>
                <Table<TeamMember>
                  columns={[
                    {
                      id: "name",
                      header: "Name",
                      sortable: true,
                      cell: (row) => row.name,
                    },
                    {
                      id: "role",
                      header: "Role",
                      sortable: true,
                      cell: (row) => (
                        <span className="cs-preview-pages-patterns-master-detail-demo-22">
                          {row.role}
                        </span>
                      ),
                    },
                    {
                      id: "commits",
                      header: "Commits",
                      sortable: true,
                      align: "right",
                      cell: (row) => row.commits,
                    },
                    {
                      id: "reviews",
                      header: "Reviews",
                      sortable: true,
                      align: "right",
                      cell: (row) => row.reviews,
                    },
                    {
                      id: "status",
                      header: "Status",
                      sortable: false,
                      width: "100px",
                      cell: (row) => (
                        <StatusBadge
                          label={row.status}
                          status={row.status}
                        />
                      ),
                    },
                  ]}
                  data={sortedMembers}
                  rowKey={(row) => row.name}
                  sort={memberSort}
                  onSort={(columnId, direction) =>
                    setMemberSort({ columnId, direction })
                  }
                />
              </div>

              {/* Bottom half: team summary detail */}
              <div className="cs-preview-pages-patterns-master-detail-demo-190 ">
                <div className="cs-preview-pages-patterns-master-detail-demo-31 ">
                  <div className="cs-preview-pages-patterns-master-detail-demo-32 ">
                    <span className="cs-preview-pages-patterns-master-detail-demo-95 ">
                      Team Summary
                    </span>
                    <StatusBadge
                      label={`${team.members.length} members`}
                      status="neutral"
                    />
                    <StatusBadge
                      label={`${team.openPRs} open PRs`}
                      status={team.openPRs > 5 ? "warning" : "success"}
                    />
                  </div>
                  <div className="cs-preview-pages-patterns-master-detail-demo-215 ">
                    <span className="cs-preview-pages-patterns-master-detail-demo-22">
                      Avg commits:{" "}
                      <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                        {Math.round(team.totalCommits / team.members.length)}
                      </span>
                    </span>
                    <span className="cs-preview-pages-patterns-master-detail-demo-22">
                      Avg reviews:{" "}
                      <span className="cs-preview-pages-patterns-master-detail-demo-37 ">
                        {Math.round(team.members.reduce((s, m) => s + m.reviews, 0) / team.members.length)}
                      </span>
                    </span>
                  </div>
                  <p className="cs-preview-pages-patterns-master-detail-demo-218 ">
                    The {team.name} team is led by {team.lead} with {team.members.length} members contributing a total of {team.totalCommits.toLocaleString()} commits. There {team.openPRs === 1 ? "is" : "are"} currently {team.openPRs} open pull request{team.openPRs !== 1 ? "s" : ""} awaiting review.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="cs-preview-pages-patterns-master-detail-demo-43 ">
              Select a team from the table
            </div>
          ),
        },
      ]}
    />
  );
}

/* ── Exported demo ─────────────────────────────────────── */

export function MasterDetailDemo() {
  return (
    <CardGroup>
      <Card id="flat" header="Flat Master-Detail" maximizable>
        <FlatMasterDetail />
      </Card>
      <Card id="nested" header="Nested Master-Detail" maximizable>
        <NestedMasterDetail />
      </Card>
      <Card id="long-list" header="Long List Variant" maximizable>
        <LongListMasterDetail />
      </Card>
    </CardGroup>
  );
}
