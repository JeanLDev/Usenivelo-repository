<div>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className={`mx-0 sm:mx-0 md:mx-3 flex gap-4 overflow-x-auto min-h-[100vh] sm:mx-6 md:ml-0`}>
              {columnsData.columnOrder.map(columnId => {
              const column = columnsData.columns[columnId];
              const step = steps.find(s => s.id === column.id);
              if (!step) return null;
              // 🟦 Verifica se o usuário logado é o dono do Kanban
              const isOwner = kanban.user_id === user?.id;
              // 🟦 Permissões do usuário nessa etapa
              const stepUsers = stepsPerms.filter(
                p => p.step_id === step.id && p.user_id === user?.id
              );
              // 🟥 Se NÃO for dono e NÃO tiver permissão, não renderiza a etapa
              if (!isOwner && stepUsers.length === 0) return null;
              // 🟩 Se for o DONO, ele tem todas as permissões automaticamente
              const canMoveStep   = isOwner ? true : (stepUsers[0]?.move   ?? false);
              const canCreate     = isOwner ? true : (stepUsers[0]?.create ?? false);
              const canEdit       = isOwner ? true : (stepUsers[0]?.edit   ?? false);
              const canView       = isOwner ? true : (stepUsers[0]?.view   ?? false);
              const canDelete     = isOwner ? true : (stepUsers[0]?.delete ?? false);
              // 🟦 Usuários permitidos no step
              const permittedUsers = stepsPerms
                .filter(p => p.step_id === step.id)
                .map(p => usuarios.find(u => u.id === p.user_id))
                .filter(Boolean);
              // 🟦 Empresas desses usuários
              const permittedCompanies = permittedUsers
                .map(u => companies.find(c => c.id === u.company_id))
                .filter(Boolean);
              const color = column.color
              
              return (
                <Droppable droppableId={column.id} key={column.id} isDropDisabled={!canMoveStep} >
                  {provided => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-shrink-0
                     rounded-md w-72 sm:w-72 md:w-80  pb-5`}
                     style={{ backgroundColor: `${color}60` }}
                     >
                      <div className={`flex justify-between items-center   p-5 shadow-md border border-gray-300 rounded-sm z-20`}
                      style={{ backgroundColor: `${color}` }}
                      >
                       <div className="flex items-center gap-2">
                              {editingTitle === column.id ? (
                                <input
                                  type="text"
                                  value={editTitleValue}
                                  onChange={(e) => setEditTitleValue(e.target.value)}
                                  onBlur={() => handleRenameStep(column.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameStep(column.id);
                                  }}
                                  autoFocus
                                  className="font-bold border-b border-gray-300 focus:outline-none focus:border-purple-500 bg-transparent w-full"
                                />
                              ) : (
                                <h2
                                  className="font-bold cursor-pointer hover:underline"
                                  onClick={() => {
                                    setEditingTitle(column.id);
                                    setEditTitleValue(column.title);
                                  }}
                                >
                                  {column.title}
                                </h2>
                              )}
                        </div>
                        {canCreate && (
                        <div className="relative">
                          <div className="flex space-y-1 items-center">
                            <div className="flex -space-x-2">
                                {permittedCompanies.map((comp, i) => (
                                  <div key={i} className="relative group">
                                    <img
                                      src={comp.logo_url || comp.logo}
                                      className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-100">
                                      {comp.name}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                          {openSubmoduleDropdown === step.id && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-300 rounded shadow z-50">
                              {usuarioComSubmodules?.submodules?.map(sub => (
                                <button
                                  key={sub.submodule_id}
                                  onClick={() => {
                                    setOpenSubmoduleDropdown(null);
                                    setCurrentStep(step);
                                    // setar qual submodule está criando
                                    setFormData(prev => ({
                                      ...prev,
                                      _submodule_id: sub.submodule_id
                                    }));
                                    selectSubmodule(sub, step.id)
                                    setRecord([])
                                  }}
                                  className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                          )}
                      </div>
                      {/**Botão de Novo Card */}
                      <SplitButton
                        mainLabel="Novo Card"
                        onMainClick={() =>  {
                          selectSubmodule('main', step.id)
                          setRecord([]);
                          setOnlyView(false);
                          if(isOwner) setCanEdit(true)
                        }}
                        options={usuarioComSubmodules?.submodules?.map((sub) => ({
                          label: sub.name,
                          submodule: sub,
                        }))}
                        onSelect={({ submodule }) => {
                          // 🔁 exatamente o mesmo comportamento do MoreVertical
                          setCanEdit(canEdit)
                          setOpenSubmoduleDropdown(null);
                          setCurrentStep(step);
                          setFormData(prev => ({ ...prev, _submodule_id: submodule.submodule_id }));
                          selectSubmodule(submodule, step.id);
                          setRecord([]);
                          setOnlyView(false);
                        }}
                      />
                      {column.cardIds
            .filter((cardId) => {
              const card = cardsData[cardId];
              if (!card) return false;
          
              // ----------------------------------
              //  FILTRO POR CAMPO (activeFilter)
              // ----------------------------------
              if (activeFilter?.column && activeFilter?.value) {
                const fieldValue = card.data?.[activeFilter.column];
                const fv = fieldValue?.toString().toLowerCase() ?? "";
                const filterVal = activeFilter.value.toLowerCase();
          
                switch (activeFilter.operator) {
          case "=": // igual
            if (fv !== filterVal) return false;
            break;
          case "!=": // diferente
            if (fv === filterVal) return false;
            break;
          case "contains": // contém
            if (!fv.includes(filterVal)) return false;
            break;
          case ">": // maior que (número)
            if (Number(fieldValue) <= Number(activeFilter.value)) return false;
            break;
          case "<": // menor que (número)
            if (Number(fieldValue) >= Number(activeFilter.value)) return false;
            break;
          default:
            break;
                }
              }
          
              // ----------------------------------
              //  FILTRO POR DATA (periodo)
              // ----------------------------------
              const dataCard = toDateOnlyString(card.created_at);
          
              const start = periodo.start ? toDateOnlyString(periodo.start) : null;
              const end = periodo.end ? toDateOnlyString(periodo.end) : null;
          
              // sem filtro de data
              if (!start && !end) return true;
          
              // um único dia
              if (start && !end) {
                return dataCard === start;
              }
          
              // intervalo
              if (start && end) {
                return dataCard >= start && dataCard <= end;
              }
          
              return true;
            })
            .map((cardId, index) => (
              <KanbanCard
                key={cardId}
                card={cardsData[cardId]}
                index={index}
                canMoveStep={canMoveStep}
                usuarios={usuarios}
                companies={companies}
                submodules={submodules}
                step={step}
                canView={canView}
                canEdit={canEdit}
                canDelete={canDelete}
                
                openMenuCardId={openMenuCardId}
                setOpenMenuCardId={setOpenMenuCardId}
                selectSubmoduleButton={selectSubmoduleButton}
                setRecord={setRecord}
                setCanEdit={setCanEdit}
                setOnlyView={setOnlyView}
                handleReloadKanban={handleReloadKanban}
                supabase={supabase}
              />
            ))}
          {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
            </div>
          </DragDropContext>
        </div>